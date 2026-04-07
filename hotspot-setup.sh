#!/usr/bin/env bash
# hotspot-setup.sh — configure wlan1 as a persistent NM-managed hotspot
set -euo pipefail

# ── colours ────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${GREEN}[✓]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[!]${RESET} $*"; }
error()   { echo -e "${RED}[✗]${RESET} $*" >&2; exit 1; }
heading() { echo -e "\n${BOLD}$*${RESET}"; }

# ── require sudo ───────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  exec sudo bash "$0" "$@"
fi

heading "Pi Dashboard — Hotspot Setup"
echo "Sets up a USB WiFi dongle as a persistent access point so you can"
echo "access the dashboard from anywhere without knowing the local network."
echo ""

# ── check NetworkManager ───────────────────────────────────────────────────
if ! systemctl is-active --quiet NetworkManager; then
  error "NetworkManager is not running. This script requires NetworkManager."
fi

# ── detect wifi interfaces ─────────────────────────────────────────────────
heading "Detecting WiFi interfaces..."

is_usb() {
  local iface=$1
  local devpath
  devpath=$(readlink -f /sys/class/net/"$iface"/device 2>/dev/null || true)
  echo "$devpath" | grep -qi usb
}

AP_IFACE=""
INTERNET_IFACE=""
declare -a WIFI_IFACES=()

for iface in /sys/class/net/*/wireless; do
  [[ -d "$iface" ]] || continue
  name=$(basename "$(dirname "$iface")")
  WIFI_IFACES+=("$name")
done

if [[ ${#WIFI_IFACES[@]} -lt 2 ]]; then
  error "Found fewer than 2 WiFi interfaces (${WIFI_IFACES[*]-none}). Plug in the USB dongle and try again."
fi

for iface in "${WIFI_IFACES[@]}"; do
  if is_usb "$iface"; then
    AP_IFACE="$iface"
    info "USB adapter (hotspot):  $iface"
  else
    INTERNET_IFACE="$iface"
    info "Onboard chip (internet): $iface"
  fi
done

if [[ -z "$AP_IFACE" || -z "$INTERNET_IFACE" ]]; then
  warn "Could not auto-detect which interface is USB."
  echo "Available interfaces: ${WIFI_IFACES[*]}"
  read -rp "  Enter the interface to use for the hotspot (e.g. wlan1): " AP_IFACE
  for iface in "${WIFI_IFACES[@]}"; do
    [[ "$iface" != "$AP_IFACE" ]] && INTERNET_IFACE="$iface"
  done
fi

echo ""
echo "  Hotspot interface : $AP_IFACE"
echo "  Internet interface: $INTERNET_IFACE"
echo ""
read -rp "Looks right? [Y/n] " confirm
[[ "${confirm,,}" == "n" ]] && error "Aborted. Re-run and enter the correct interface when prompted."

# ── check AP mode support ──────────────────────────────────────────────────
heading "Checking AP mode support on $AP_IFACE..."
PHY=$(cat /sys/class/net/"$AP_IFACE"/phy80211/name 2>/dev/null || true)
if [[ -n "$PHY" ]]; then
  if iw phy "$PHY" info 2>/dev/null | grep -qw "AP"; then
    info "$AP_IFACE supports AP mode"
  else
    error "$AP_IFACE does not support AP mode. The hotspot cannot be created with this adapter."
  fi
else
  warn "Could not verify AP mode support — continuing anyway."
fi

# ── hotspot config ─────────────────────────────────────────────────────────
heading "Hotspot configuration"

DEFAULT_SSID="PiDashboard"
DEFAULT_PASS="raspberry"
DEFAULT_IP="192.168.4.1"
CON_NAME="pi-hotspot"

read -rp "  SSID         [${DEFAULT_SSID}]: " SSID
SSID="${SSID:-$DEFAULT_SSID}"

while true; do
  read -rsp "  Password     [${DEFAULT_PASS}]: " PASS; echo ""
  PASS="${PASS:-$DEFAULT_PASS}"
  if [[ ${#PASS} -lt 8 ]]; then
    warn "WPA2 requires at least 8 characters. Try again."
  else
    break
  fi
done

read -rp "  Hotspot IP   [${DEFAULT_IP}]: " HOTSPOT_IP
HOTSPOT_IP="${HOTSPOT_IP:-$DEFAULT_IP}"

# ── install hostapd ────────────────────────────────────────────────────────
heading "Installing hostapd..."
if dpkg -l hostapd &>/dev/null && dpkg -l hostapd | grep -q "^ii"; then
  info "hostapd already installed"
else
  apt-get install -y hostapd
  info "hostapd installed"
fi

# Make sure hostapd service itself is masked — NM drives it directly
systemctl unmask hostapd 2>/dev/null || true
systemctl stop hostapd   2>/dev/null || true
systemctl disable hostapd 2>/dev/null || true

# ── remove existing hotspot connection if present ──────────────────────────
if nmcli con show "$CON_NAME" &>/dev/null; then
  warn "Existing '$CON_NAME' connection found — replacing it."
  nmcli con delete "$CON_NAME"
fi

# ── create NM hotspot connection ───────────────────────────────────────────
heading "Creating hotspot connection..."

nmcli con add \
  type wifi \
  ifname "$AP_IFACE" \
  con-name "$CON_NAME" \
  ssid "$SSID" \
  802-11-wireless.mode ap \
  802-11-wireless.band bg \
  802-11-wireless.channel 6 \
  wifi-sec.key-mgmt wpa-psk \
  wifi-sec.psk "$PASS" \
  ipv4.method shared \
  ipv4.address "${HOTSPOT_IP}/24" \
  connection.autoconnect yes \
  connection.autoconnect-priority 10

info "Connection profile created"

# ── bring it up ────────────────────────────────────────────────────────────
heading "Starting hotspot..."
nmcli con up "$CON_NAME"

sleep 2
STATE=$(nmcli -t -f GENERAL.STATE device show "$AP_IFACE" 2>/dev/null | cut -d: -f2 || true)

if echo "$STATE" | grep -q "100\|connected"; then
  info "Hotspot is active"
else
  warn "Hotspot may not be fully up yet (state: ${STATE}). Check: sudo nmcli con up $CON_NAME"
fi

# ── print summary ──────────────────────────────────────────────────────────
heading "Done!"
echo ""
echo -e "  SSID:          ${BOLD}${SSID}${RESET}"
echo -e "  Password:      ${BOLD}${PASS}${RESET}"
echo -e "  Pi address:    ${BOLD}${HOTSPOT_IP}${RESET}"
echo -e "  Dashboard:     ${BOLD}http://${HOTSPOT_IP}:3001${RESET}"
echo ""
echo "The hotspot will start automatically on boot whenever $AP_IFACE is plugged in."
echo ""
echo "To remove: sudo nmcli con delete $CON_NAME"
echo "Docs:      docs/hotspot-setup.md"
