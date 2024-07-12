const os = require('os');
const express = require('express');
const path = require('path');
const fs = require('fs');
const { schedule } = require('./alg');
const assert = require('assert');

const app = express();
const PORT = 3001;

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public'))
})

const ROTATIONS = {
    north: 0,
    east: 1,
    south: 2,
    west: 3,
}
const OPPOSITES = {north: 'south', south: 'north', east: 'west', west: 'east'}

let layout = JSON.parse(fs.readFileSync('layout.json', 'utf8'))
let orderList = JSON.parse(fs.readFileSync('order.json', 'utf8'))

let orders = {}
let delivered = {}
for(let item of orderList) orders[item.point] = item.count

let plan = schedule(layout, orders);
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

    res.write(`event: layout\n`)
    res.write(`data: ${JSON.stringify(layout)}\n\n`)
    sendRobotAction("sleep")

    req.on('close', () => {
        statusConnections.delete(res)
        res.end()
    });
})

const sendStatusEvent = (name, data) => {
    console.log('status event', name, data)
    statusConnections.forEach(res => {
        res.write(`event: ${name}\n`)
        res.write(`data: ${JSON.stringify(data)}\n\n`)
    })
}

const sendRobotAction = (action, value) => {
    let point = layout.points[robotState.point]
    sendStatusEvent('robot', {
        x: point.x,
        y: point.y,
        drinks: robotState.drinks,
        direction: robotState.direction,
        action: action,
        value: value,
    })
}


app.get('/command', (req, res) => {

    if (req.query.obstruction) {
        // Move back to previous node and schedule and block and a replan
        console.log('obstruction')
        let reverseDirection = OPPOSITES[robotState.direction]
        plan = [{command: 'move', direction: reverseDirection}, {command: 'obstruct', direction: robotState.direction}]
    }

    function reply(obj) {
        console.log("command reply", obj)
        return res.json(obj)
    }

    let todo = plan[0]
    if (!todo) {
        sendRobotAction("sleep")
        sendStatusEvent("done", {})
        return reply({command: "sleep", value: 10, done: true, audio: "done"})
    }

    if (todo.command == 'obstruct') {
        plan = schedule(layout, orderList);
        console.log('new plan', plan)
        
        sendRobotAction("rotate", rotate)
        return reply({command: "rotate", value: rotate})
    }
    
    if (todo.command == "move") {
        if (todo.direction != robotState.direction) {
            // Don't shift the plan! We'll need to look at this again on the next /command request.
            let rotate = (ROTATIONS[todo.direction] - ROTATIONS[robotState.direction]) % 4
            sendRobotAction("rotate", rotate)
            robotState.direction = todo.direction
            return reply({command: "rotate", value: rotate})
        }
        plan.shift();
        let sample = Math.floor(Math.random() * 6)
        let audio = sample < 3 ? "move"+sample : undefined
        let oldPoint = robotState.point
        let newPoint = layout.points[oldPoint][todo.direction]
        assert(newPoint)
        sendRobotAction("move", Math.abs(layout.points[oldPoint].x-layout.points[newPoint].x) + Math.abs(layout.points[oldPoint].y-layout.points[newPoint].y))
        robotState.point = newPoint
        return reply({command: "move", audio: audio})
    }

    if (todo.command == "deliver" || todo.command == "pickUp") {
        plan.shift();
        if (todo.command == "deliver") {
            let point = robotState.point
            orders[point] -= todo.count
            delivered[point] = (delivered[point] || 0) + todo.count
            sendStatusEvent("delivered", {x: layout.points[point].x, y: layout.points[point].y, count: delivered[point]})
            robotState.drinks -= todo.count
        } else {
            robotState.drinks += todo.count
        }
        sendRobotAction("sleep")
        return reply({command: "sleep", value: 1, audio: todo.command+todo.count})
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
