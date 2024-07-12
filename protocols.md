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
- done


## Commands the robot

Whenever the robot is doing nothing it will send an HTTP request to the server `/command`.

That will returns JSON such as:

- {"command": "rotate", "value: "right", "audio": "file1.mp3"}
- {"command": "move"} // til the next point
- {"command": "sleep", "value": timeInSeconds}

When the robot detects an obstacle within 20cm, it stops and retrieves new instructions using `/command?obstruction=true`.


## Interface with alg

let plan = alg.schedule(layout, orders)

plan = [
- {"command": "move", "direction": "north"},
- {"command": "deliver", "count": numberOfDrinks}
- {"command": "move", "direction": "south"},
- {"command": "pickUp", "count": numberOfDrinks}
]
