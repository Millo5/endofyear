const fs = require('fs');

// Parse JSON files
function parseJsonFiles(layoutFile, orderFile) {
    try {
        const layout = JSON.parse(fs.readFileSync(layoutFile, 'utf8'));
        const orders = JSON.parse(fs.readFileSync(orderFile, 'utf8'));
        return [layout, orders];
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`File not found: ${error.path}`);
        } else if (error instanceof SyntaxError) {
            console.error(`Error parsing JSON: ${error.message}`);
        } else {
            console.error(`Error reading files: ${error.message}`);
        }
        return [null, null];
    }
}

// BFS for shortest path
function bfsShortestPath(layout, start, goal) {
    const graph = layout.points;
    const queue = [[start, [start]]];
    const visited = new Set();
    while (queue.length > 0) {
        const [current, path] = queue.shift();
        if (current === goal) {
            return path;
        }
        if (visited.has(current)) {
            continue;
        }
        visited.add(current);
        for (const [direction, neighbor] of Object.entries(graph[current])) {
            if (direction !== 'x' && direction !== 'y' && !visited.has(neighbor)) {
                queue.push([neighbor, path.concat(neighbor)]);
            }
        }
    }
    return [];
}

// Calculate commands from path
function calculateCommands(path, layout) {
    const commands = [];
    const points = layout.points;

    for (let i = 0; i < path.length - 1; i++) {
        const current = path[i];
        const next = path[i + 1];
        const currentPoint = points[current];
        const nextPoint = points[next];

        for (const [direction, neighbor] of Object.entries(currentPoint)) {
            if (neighbor === next) {
                commands.push({ "command": "move", "direction": direction });
                break;
            }
        }
    }

    return commands;
}

// Delivery robot algorithm
function deliveryRobot(layout, orders) {
    const pickupPoint = layout["pickup-point"];
    let currentPosition = pickupPoint;
    const drinkCapacity = 5;
    let currentDrinks = 0;
    const plan = [];

    while (orders.length > 0) {
        const ordersToDeliver = [];
        const remainingOrders = [];

        // Collect up to drink_capacity orders
        for (const order of orders) {
            if (currentDrinks + order.count <= drinkCapacity) {
                ordersToDeliver.push(order);
                currentDrinks += order.count;
            } else {
                remainingOrders.push(order);
            }
        }

        // Go to pickup point
        const pathToPickup = bfsShortestPath(layout, currentPosition, pickupPoint);
        plan.push(...calculateCommands(pathToPickup, layout));
        plan.push({ "command": "pickUp", "count": currentDrinks });
        currentPosition = pickupPoint;

        // Deliver all collected orders
        for (const order of ordersToDeliver) {
            const destination = order.point;
            const pathToDelivery = bfsShortestPath(layout, currentPosition, destination);
            plan.push(...calculateCommands(pathToDelivery, layout));
            plan.push({ "command": "deliver", "count": order.count });
            currentPosition = destination;
        }

        // Reset currentDrinks and update orders
        currentDrinks = 0;
        orders = remainingOrders;
    }

    console.log("All orders have been delivered.");
    return plan;
}

// Example usage
const layoutFile = 'layout.json';
const orderFile = 'order.json';
const [layout, orders] = parseJsonFiles(layoutFile, orderFile);
if (layout && orders) {
    const plan = deliveryRobot(layout, orders);
    console.log(plan);
}
