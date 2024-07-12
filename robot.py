import socket
import time
import json
import cyberpi

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


def hex_to_rgb(hex_color):
    hex_color = str(hex_color)
    if hex_color[0] == '#':
        hex_color = hex_color[1:]
    if hex_color[0:2] == '0x':
        hex_color = hex_color[2:]
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def color_distance(c1, c2):
    return sum((a-b)**2 for a, b in zip(hex_to_rgb(c1), hex_to_rgb(c2)))


def closest_color(constants, target):
    return min(constants, key=lambda x: color_distance(x, target))

# Example usage
constant_colors = {
    '0xFF0000': 'white',
    '0x00FF00': 'orange',
    '0x0000FF': 'black',
}


def get_color_type(color):
    x = constant_colors[closest_color(constant_colors.keys(), color)]
    # print_msg(x)
    return x


BLINK_SPEED = 0.5
WIFI_SSID = "De Vluchte"
WIFI_PASS = "inloopkoelkast"
WEB_SERVER_IP = "192.168.0.155"
WEB_SERVER_PORT = 3001
LINE_THRESHOLD = 50
SPEED = 20

# GLOBAL VARIABLES
distance = 300
l1 = 0
l2 = 0
r1 = 0
r2 = 0
any_line = 0



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


def get_line_bits(line_is_white, threshold = 50):
    global distance
    distance = cyberpi.ultrasonic2.get(index=1)
    val = 0
    if get_color_type(cyberpi.quad_rgb_sensor.get_color("L2")) != "black":
        val += 8
    if get_color_type(cyberpi.quad_rgb_sensor.get_color("L1")) != "black":
        val += 4
    if get_color_type(cyberpi.quad_rgb_sensor.get_color("R1")) != "black":
        val += 2
    if get_color_type(cyberpi.quad_rgb_sensor.get_color("R2")) != "black":
        val += 1
    return val


WHITE = "FFFFFF"
YELLOW = "ffe888"
FLOOR = "312626"

def follow_line():
    i = 0
    while True:
        color = cyberpi.quad_rgb_sensor.get_color('l1')
        print(type(color))
        time.sleep(1)
        
        left_speed_multiplier = 1
        right_speed_multiplier = 1
        
        # Check where the line is sensed, configured for following a white line with a black background
        detected_line_bit_mask = get_line_bits(True, 50)
        
        # Turn left when we detect the line on the left
        # When we detect white only the left side
        if detected_line_bit_mask == 0b1000 or detected_line_bit_mask == 0b0100:
            left_speed_multiplier = 0
        elif detected_line_bit_mask == 0b1100:
            left_speed_multiplier = -1
           
        # Turn right when we detect the line on the right
        if detected_line_bit_mask == 0b0001 or detected_line_bit_mask == 0b0010:
            right_speed_multiplier = 0
        elif detected_line_bit_mask == 0b0011:
            right_speed_multiplier = -1
            
        # If we don't detect the line go back by half the speed
        if detected_line_bit_mask == 0:
            left_speed_multiplier = -0.5
            right_speed_multiplier = -0.5

        # If no special line cases are hit, we just keep moving forward
        # as the line is where we expect it to be (one or both of the center sensors)
            
        # The right wheel motor has to spin in te reverse direction to moe forward
        cyberpi.mbot2.drive_power(SPEED * left_speed_multiplier, -SPEED * right_speed_multiplier)

        # Check for purple color to stop
        color = get_color_type(cyberpi.quad_rgb_sensor.get_color('l1')
)
        if color == 'orange' and i >= 20:
            cyberpi.mbot2.EM_stop()
            break
        
        if detected_line_bit_mask == 0 and i >= 20:
            cyberpi.mbot2.drive_power(SPEED, -SPEED)

        # Keep going back for a second when we lost the line.
        elif detected_line_bit_mask == 0:
            time.sleep(1)

        i += 1


def execute_command(command_dict: dict) -> None:
    command = command_dict.get("command", "").upper()
   # print_msg(command)
    
    if command == "MOVE":
        follow_line()
    elif command == "ROTATE":
        value = command_dict.get("value", 0)
        cyberpi.mbot2.turn(value)
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
        try:
            if distance <= 10:
                response = http_get(WEB_SERVER_IP, WEB_SERVER_PORT, "/command?obstruction=true")
            else:
                response = http_get(WEB_SERVER_IP, WEB_SERVER_PORT, "/command")

            command = parse_command(response[1])
            execute_command(command)
        except Exception as e:
            print_error(e)
        time.sleep(1)

except Exception as e:
    print_error(e)
