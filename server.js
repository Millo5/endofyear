const os = require('os');
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public'))
})

let ROTATIONS = {
    north: 0,
    east: 1,
    south: 2,
    west: 3,
}

let layout = JSON.parse(fs.readFileSync('layout.json', 'utf8'))
let order = JSON.parse(fs.readFileSync('order.json', 'utf8'))
let plan = [
    {"command": "move", "direction": "north"},
    {"command": "deliver", "count": 2},
    {"command": "move", "direction": "south"},
    {"command": "pickUp", "count": 3}
]
let robotState = {
    point: layout["pickup-point"],
    direction: layout["start-direction"]
}

app.get('/status', (req, res) => {
})

app.get('/command', (req, res) => {
    let todo = plan[0]
    if (!todo) {
        return res.json({command: "sleep", value: 10, done: true, audio: "done"})
    }
    if (todo.command == "move") {
        if (todo.direction != robotState.direction) {
            // Don't shift the plan! We'll need to look at this again on the next /command request.
            let rotate = (ROTATIONS[todo.direction] - ROTATIONS[robotState.direction] + 4) % 4
            return res.json({command: "rotate", value: rotate==1 ? "right" : "left"})
        }
        plan.shift();
        let sample = Math.floor(Math.random() * 6);
        let audio = sample < 3 ? "move"+sample : undefined;
        return res.json({command: "move", audio: audio})
    }

    if (todo.command == "deliver" || todo.command == "pickUp") {
        plan.shift();
        res.json({command: "sleep", value: 1, audio: todo.command+todo.count})
    }

    plan.shift();
    return res.json({"command": "sleep", "error": "Invalid plan"})
})

// - {"command": "rotate", "value: "right", "audio": "file1.mp3"}
// - {"command": "move"} // til the next point
// - {"command": "sleep", "value": timeInSeconds}



app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on...`);
    const networkInterfaces = os.networkInterfaces();
    for (const iface of Object.values(networkInterfaces)) {
      iface.forEach(address => {
        if (address.family === 'IPv4') {
          console.log(`- http://${address.address}:3001`)
        }
      });
    }
})
