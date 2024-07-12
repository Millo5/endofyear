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
let orderList = JSON.parse(fs.readFileSync('order.json', 'utf8'))
let orders = {}
for(let k of orderList) orders[k.point] = order.count

let plan = schedule(layout, orderList);
console.log('plan', plan)

let robotState = {
    point: layout["pickup-point"],
    direction: layout["start-direction"],
    drinks: 0,
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
}

const sendRobotAction = (action, value) => {
    let point = layout.points[robotState.point]
    sendStatusEvent({
        x: point.x,
        y: point.y,
        drinks: robotState.drinks,
        direction: robotState.direction,
        action: action,
        value: value,
    })
}


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
            sendRobotAction("rotate", rotate)
            return reply({command: "rotate", value: rotate})
        }
        plan.shift();
        let sample = Math.floor(Math.random() * 6)
        let audio = sample < 3 ? "move"+sample : undefined
        let oldPoint = robotState.point
        let newPoint = robotState.point = layout.points[oldPoint][todo.direction]
        sendRobotAction("move", Math.abs(oldPoint.x-newPoint.x) + Math.abs(oldPoint.y-newPoint.y))
        return reply({command: "move", audio: audio})
    }

    if (todo.command == "deliver" || todo.command == "pickUp") {
        plan.shift();
        if (todo.command == "deliver") {
            sendStatusEvent("delivered", {})
            robotState.drinks -= todo.count
        }
        sendRobotAction("sleep")
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
