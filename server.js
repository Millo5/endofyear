const os = require('os');
const express = require('express');
const path = require('path');
const fs = require('fs');
const { schedule } = require('./alg');

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
let plan = schedule(layout, order);
let robotState = {
    point: layout["pickup-point"],
    direction: layout["start-direction"]
}

let statusConnections = new Set()

app.get('/status', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    statusConnections.add(res)

    res.write(`event: layout\n`);
    res.write(`data: ${JSON.stringify(layout)}\n\n`);

    req.on('close', () => {
        statusConnections.remove(res)
        res.end()
    });
})

const sendStatusEvent = (name, data) => {
    statusConnections.forEach(res => {
        res.write(`event: ${name}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    })
};



app.get('/command', (req, res) => {

    function reply(obj) {
        console.log("command reply", obj)
        return res.json(obj)
    }

    let todo = plan[0]
    if (!todo) {
        sendStatusEvent("done", {})
        return reply({command: "sleep", value: 10, done: true, audio: "done"})
    }
    if (todo.command == "move") {
        if (todo.direction != robotState.direction) {
            // Don't shift the plan! We'll need to look at this again on the next /command request.
            let rotate = (ROTATIONS[todo.direction] - ROTATIONS[robotState.direction]) % 4
            robotState.direction = todo.direction
            return reply({command: "rotate", value: rotate})
        }
        plan.shift();
        let sample = Math.floor(Math.random() * 6)
        let audio = sample < 3 ? "move"+sample : undefined
        robotState.point = layout.points[robotState.point][todo.direction]
        return reply({command: "move", audio: audio})
    }

    if (todo.command == "deliver" || todo.command == "pickUp") {
        plan.shift();
        reply({command: "sleep", value: 1, audio: todo.command+todo.count})
    }

    plan.shift();
    return reply({"command": "sleep", "error": "Invalid plan"})
})


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
