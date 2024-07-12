// import * as THREE from 'three'


// Reference




const SYNC = 0;
const PREDICT = 1;

const PI = 3.14159265;

const S = 8;
const DANGLE = 0.05;
const DDISPLACE = 0.01;

const DIRECTION = {
    "north": {x: 0, y: -1, a: 0},
    "east": {x: 1, y: 0, a: PI/2},
    "south": {x: 0, y: 1, a: PI},
    "west": {x: -1, y: 0, a: PI/4 * 3},
}

const createNode = (scene, x, y) => {
    const g = new THREE.CylinderGeometry()
    const material = new THREE.MeshPhongMaterial({ color: 0x0000ff });
    const cube = new THREE.Mesh(g, material);

    cube.position.x = x * S + 1;
    cube.position.z = y * S + 1;

    scene.add(cube);
}


const createBeer = (x, y) => {
    const g = new THREE.CylinderGeometry()
    const material = new THREE.MeshPhongMaterial({ color: 0xff3333 });
    const cube = new THREE.Mesh(g, material);

    cube.position.x = x * S + 1;
    cube.position.z = y * S + 1;

    scene.add(cube);
    return cube;
}

const RESET = () => {
    robot.x = 0;
    robot.y = 0;
}

var layout = []

var robot = {
    x: 0,
    y: 0,
    a: 0,
    facing: "north",
    beers: [],

    drinks: 0,
    target_x: 1,
    target_y: 0,
    target_a: PI/2,
    orientation: "north",

    action: "rotate", // rotate/move/sleep
    value: "west",  // 'left'/'right' | distance

    state: SYNC
}

RESET();

function setupSSE() {
    const eventSource = new EventSource('/status')

// layout robot delivered
    eventSource.addEventListener("layout", (event) => {
        const data = JSON.parse(event.data);

        const pickupPoint = data["pickup-point"];
        const points = data["points"]
        console.log(points)
        
        Object.keys(points).forEach(i => {
            console.log(i);
            console.log(points[i]);

            const point = points[i]
            createNode(scene, point.x, point.y)
        })

    });
    eventSource.addEventListener("robot", (event) => {
        const data = JSON.parse(event.data);
        console.log(data);
    });
    eventSource.addEventListener("delivered", (event) => {
        const data = JSON.parse(event.data);
        console.log(data);
    });


}

var scene = new THREE.Scene;

const main = () => {
    setupSSE();

    // Set up the scene, camera, and renderer
    scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas') });

    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Add the cube to the scene
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshPhongMaterial({ color: 0x00ffff });
    const robotObj = new THREE.Mesh(geometry, material);
    robotObj.position.y = 1;
    scene.add(robotObj);

    // Add the floor
    const floor_g = new THREE.PlaneGeometry();
    const fmaterial = new THREE.MeshPhongMaterial({ color: 0x44ff44 });
    const floor = new THREE.Mesh(floor_g, fmaterial);
    floor.scale.set(1000, 1000, 1000);
    floor.rotation.x = -PI/2;
    scene.add(floor);



    // Light
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    camera.position.z = 5;
    camera.position.y = 3;

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.update();

    // Create a function to animate the scene
    function animate() {
        requestAnimationFrame(animate);

        
        if (robot.state == SYNC) {
            robot.x = lerp(robot.x, robot.target_x, 0.1);
            robot.y = lerp(robot.y, robot.target_y, 0.1)

            const dist = Math.sqrt(
                Math.pow(robot.x - robot.target_x, 2) +
                Math.pow(robot.y - robot.target_y, 2)
            );
            if (dist < 0.1) {
                robot.a = lerp(robot.a, DIRECTION[robot.orientation].a, 0.1);
              
                const rotOff = Math.sqrt(
                    Math.pow(robot.a - DIRECTION[robot.orientation].a, 2)
                );  
                if (rotOff < 0.1 && dist < 0.01) {
                    robot.state = PREDICT;
                }
            }
        }

        if (robot.state == PREDICT) {
            if (robot.action == "move") {
                const target_x = robot.target_x + DIRECTION[robot.value].x
                const target_y = robot.target_y + DIRECTION[robot.value].y
                
                // robot.x = lerp(robot.x, target_x, 0.1);
                // robot.y = lerp(robot.y, target_y, 0.1);

                const ang = Math.atan2(target_y - robot.y, target_x, - robot.x);
                robot.x += Math.cos(ang) * DDISPLACE;
                robot.y += Math.sin(ang) * DDISPLACE;

                const dist = Math.sqrt(
                    Math.pow(robot.x - target_x, 2) +
                    Math.pow(robot.y - target_y, 2)
                );
                if (dist < 0.01) {
                    robot.action = "sleep"
                }
            }
            if (robot.action == "rotate") {
                // robot.a = lerp(robot.a, robot.target_a, 0.1);
                robot.a += Math.sign(robot.target_a - robot.a) * DANGLE

                const rotOff = Math.sqrt(
                    Math.pow(robot.a - robot.target_a, 2)
                );  
                if (rotOff < 0.05) {
                    robot.action = "sleep"
                }
            }
            if (robot.action == "sleep") {} // pass
        }


        // Update Object Positions
        let oldPos = robotObj.position.clone();
        robotObj.position.x = robot.x * S;
        robotObj.position.z = robot.y * S;
        let delta = robotObj.position.clone().sub(oldPos)

        // camera.position.x = robotObj.position.x;
        // camera.position.z = robotObj.position.z;
        camera.position.add(delta)

        controls.target = robotObj.position;

        robotObj.rotation.y = robot.a;
        robotObj.position.y = 1;


        controls.update();

        renderer.render(scene, camera);
    }

    // Start the animation loop
    animate();
}

window.onload = main;



const lerp = (s, e, a) => (1 - a) * s + a * e;



// init: 
/*


*/
