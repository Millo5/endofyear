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
function schedule(layout, orderList) {
    const pickupPoint = layout["pickup-point"];
    let currentPosition = pickupPoint;
    const drinkCapacity = 5;
    let currentDrinks = 0;
    const plan = [];


    // Convert orderList to an array of orders
    const orders = Object.entries(orderList).map(([point, count]) => ({ point, count }));

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
        orders.length = 0;
        orders.push(...remainingOrders);
    }

    return plan;
}

module.exports = { schedule };
