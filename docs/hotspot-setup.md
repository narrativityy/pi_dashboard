# Hotspot Setup — Portable Access Point

This guide sets up the Pi as a portable device you can take anywhere and access
without needing to know the local network password in advance.

## How it works

The Pi runs two WiFi interfaces simultaneously:

```
[ Your phone/laptop ]
        |
        |  joins "PiDashboard" hotspot
        ↓
[ wlan1 — USB dongle ]  ←→  Pi Dashboard on 192.168.4.1:3001
        |
        |  NAT / IP forwarding (automatic)
        ↓
[ wlan0 — onboard WiFi ] ←→  your home/local router ←→ internet
```

- **`wlan1` (USB dongle)** — broadcasts a WPA2 access point with a fixed SSID
  and password. Always on when the dongle is plugged in. Clients on this network
  get a `192.168.4.x` address from the Pi's built-in DHCP server.
- **`wlan0` (onboard chip)** — connects to whatever WiFi network you configure.
  Traffic from hotspot clients is forwarded here automatically (NAT) so they
  can reach the internet too.

### Why NetworkManager handles everything

Rather than manually configuring `hostapd` + `dnsmasq` config files, this setup
uses NetworkManager's built-in hotspot support (`ipv4.method shared`). NM:

- Drives `hostapd` behind the scenes for the 802.11 AP functionality
- Runs its own DHCP server for clients connecting to the hotspot
- Automatically adds iptables NAT rules so hotspot clients can reach the internet
  through `wlan0`
- Restores everything on reboot via the saved connection profile

This means no static config files to maintain — if you change your hotspot
password you just update the NM connection.

### Why the RT5370 dongle specifically

The onboard BCM43xxx chip in the Pi Zero 2W and Pi 4 does not reliably support
AP mode while simultaneously connected to another network (client mode) —
the firmware limits it to one role at a time. A separate USB adapter with a
chip that supports AP mode (like the Ralink RT5370) sidesteps this completely
by giving the Pi a dedicated second radio.

---

## Prerequisites

- Raspberry Pi running Raspberry Pi OS Bookworm (or any distro with NetworkManager)
- USB WiFi adapter whose chip supports AP mode (RT5370 confirmed working)
- `wlan0` — onboard WiFi (for internet connection)
- `wlan1` — USB dongle (for the hotspot) — plug it in before running the script

Verify your dongle supports AP mode:
```bash
iw phy phy1 info | grep -A 10 "Supported interface modes"
# Should list "AP" in the output
```

---

## Quick install

```bash
chmod +x hotspot-setup.sh
./hotspot-setup.sh
```

The script will:
1. Detect your WiFi interfaces and confirm which is which
2. Install `hostapd`
3. Ask for an SSID and password (or use the defaults)
4. Create and activate the NetworkManager hotspot connection
5. Print the dashboard URL to connect to

---

## Manual setup

If you prefer to set it up yourself:

```bash
sudo apt install -y hostapd

sudo nmcli con add \
  type wifi \
  ifname wlan1 \
  con-name "pi-hotspot" \
  ssid "PiDashboard" \
  802-11-wireless.mode ap \
  802-11-wireless.band bg \
  802-11-wireless.channel 6 \
  wifi-sec.key-mgmt wpa-psk \
  wifi-sec.psk "yourpassword" \
  ipv4.method shared \
  ipv4.address "192.168.4.1/24" \
  connection.autoconnect yes

sudo nmcli con up pi-hotspot
```

---

## Typical workflow when arriving somewhere new

1. Plug in the USB dongle and power on the Pi
2. The hotspot (`PiDashboard`) appears automatically within ~30 seconds
3. Join `PiDashboard` from your phone or laptop
4. Open `http://192.168.4.1:3001` — the dashboard loads
5. Go to **WiFi** → scan → connect `wlan0` to the local network
6. Once `wlan0` gets an IP (visible in the dashboard's network card), SSH in:
   ```bash
   ssh pi@<wlan0-ip>
   ```
7. You can now unplug the dongle — you're on the local network directly

---

## Removing the hotspot

```bash
sudo nmcli con delete pi-hotspot
```

---

## Troubleshooting

**Hotspot doesn't appear after boot**
```bash
sudo nmcli con up pi-hotspot
sudo journalctl -u NetworkManager -n 50 --no-pager
```

**Clients connect but can't reach the dashboard**
- Confirm the Pi's hotspot IP is `192.168.4.1`: `ip addr show wlan1`
- Make sure the dashboard is running: `sudo systemctl status pi-dashboard`

**Clients connect but have no internet**
- Confirm `wlan0` is connected: `nmcli device status`
- Check IP forwarding is on: `sysctl net.ipv4.ip_forward` (should be `1`)
- NM sets this automatically when the hotspot is active — if it's `0`, restart NM:
  `sudo systemctl restart NetworkManager`

**hostapd fails to start**
```bash
sudo journalctl -u NetworkManager -n 100 --no-pager | grep -i hostapd
```
Most common cause: another process is holding `wlan1`. Check `nmcli device status`.
