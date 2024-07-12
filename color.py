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


while True:
    print_msg(cyberpi.quad_rgb_sensor.get_color('l1'))
