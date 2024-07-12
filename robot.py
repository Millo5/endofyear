import socket
import time
import json

import cyberpi

BLINK_SPEED = 0.5
WIFI_SSID = "SD42-LAB"
WIFI_PASS = "wachtwoord"
WEB_SERVER_IP = "google.com"
WEB_SERVER_PORT = 80


def print_msg(msg: str, color: str | None = None, clear: bool = True) -> None:
    if clear:
        cyberpi.console.clear()
    if color == 'r' or color == 'red':
        cyberpi.display.set_brush(255, 0, 0)
    elif color == 'g' or color == 'green':
        cyberpi.display.set_brush(0, 255, 0)
    elif color == 'b' or color == 'blue':
        cyberpi.display.set_brush(0, 0, 255)
    else:
        cyberpi.display.set_brush(255, 255, 255)
    cyberpi.console.println(msg)


def print_error(msg: object) -> None:
    print_msg("err: " + repr(msg), 'red')
    time.sleep(3)


def print_board_details() -> None:
    print_msg("mac addr: " + repr(cyberpi.get_mac_address()), clear=True)
    print_msg("firm v. : " + repr(cyberpi.get_firmware_version()), clear=False)
    print_msg("batt lev: " + repr(cyberpi.get_battery()), clear=False)
    time.sleep(1)


def connect_wifi(ssid: str, password: str, connected_msg_delay: int = 2) -> None:
    led_on = False
    print_msg("Connecting with WiFi ...", 'blue')
    cyberpi.wifi.connect(ssid, password)
    while not cyberpi.wifi.is_connect():
        if led_on:
            cyberpi.led.off()
        else:
            cyberpi.led.on("blue")
        led_on = not led_on
        time.sleep(BLINK_SPEED)
    
    print_msg("WiFi connected!", 'green')
    if connected_msg_delay > 0:
        cyberpi.led.on("green")
        time.sleep(connected_msg_delay)
    cyberpi.led.off()


def http_get(dest: str, port: int, path: str) -> tuple[dict[str, str], str]:
    if not cyberpi.wifi.is_connect():
        raise Exception("http_get() > Not connected to Wifi!")

    print_msg("HTTP GET", 'blue')

    address = dest + ":" + str(port)
    http_str = "GET " + path + " HTTP/1.1\r\nHost: " + address + "\r\nAccept: text/plain, text/html; charset=utf-8\r\nUser-Agent: mBot2\r\nConnection: close\r\n\r\n"

    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(4)
    try:
        sock.connect((dest, port))
        sock.sendall(http_str.encode())
        sock_response = sock.recv(4096).decode().split("\r\n\r\n")
        header = {}
        for header_line in sock_response[0].split("\r\n"):
            split_header = header_line.split(": ")
            if len(split_header) == 2 and len(split_header[0]) > 0 and len(split_header[1]) > 0:
                header[split_header[0]] = split_header[1]
        body = sock_response[1]
        if len(body) == 0: # pyWerkzeug splits header and body in two packages
            body = sock.recv(int(header["Content-Length"])).decode()
    except Exception as e:
        raise Exception("http_get() error: " + repr(e))
    finally:
        sock.close()

    return (header, body)


def parse_command(body: str) -> dict:
    return json.loads(body)



def execute_command(command_dict: dict) -> None:
    command = command_dict.get("command", "").upper()
    
    if command == "MOVE":
        while True:
            color = cyberpi.quad_rgb_sensor.get_color('bottom')
            if color == 'white':
                cyberpi.mbot2.drive_power(50, 50)
            elif color == 'blue':
                cyberpi.mbot2.drive_power(0, 0)
                break
            time.sleep(0.1)
    elif command == "ROTATE":
        value = command_dict.get("value", "").upper()
        if value == "LEFT":
            cyberpi.mbot2.turn_left()
        elif value == "RIGHT":
            cyberpi.mbot2.turn_right()
    elif command == "SLEEP":
        value = command_dict.get("value", 0)
        time.sleep(int(value))
    elif command == "AUDIO":
        file = command_dict.get("audio", "")
        cyberpi.audio.play(file)


try:
    print_board_details()
    connect_wifi(WIFI_SSID, WIFI_PASS)
    while True:
        response = http_get(WEB_SERVER_IP, WEB_SERVER_PORT, "/")
        for header_type, header_value in response[0].items():
            print_msg(header_type + " => " + header_value, color='blue')
            time.sleep(1)
        print_msg("HTTP body:\r\n" + response[1], color='green')
        
        command = parse_command(response[1])
        execute_command(command)
        time.sleep(3)

except Exception as e:
    print_error(e)
