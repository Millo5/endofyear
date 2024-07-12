## Server-sent events to the browser

Server on `/status`.

- layout (immediately after connect)
- robot
    - x
    - y
    - orientation: north/east/south/west
    - drinks: number

    - action: rotate/move/sleep
    - value:
        'left'/'right' (for rotate)
        distance (for move)
- delivered
    - x
    - y
    - count


## Commands the robot

Whenever the robot is doing nothing it will send an HTTP request to the server `/command`.

That will returns JSON such as:

- {"command": "rotate", "value: "right", "audio": "file1.mp3"}
- {"command": "move"} // til the next point
- {"command": "sleep", "value": timeInSeconds}

