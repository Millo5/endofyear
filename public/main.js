// import * as THREE from 'three'


// Reference

const SYNC = 0;
const PREDICT = 1;
const DONE = 3;

const PI = 3.14159265;

const S = 8;
const DANGLE = 0.05;
const DDISPLACE = 0.01;

const DIRECTION = {
    "north": {x: 0, y: -1, a: PI/2 * 3},
    "east": {x: 1, y: 0, a: 0},
    "south": {x: 0, y: 1, a: PI/2},
    "west": {x: -1, y: 0, a: PI},
}

const createNode = (scene, x, y) => {
    const g = new THREE.CylinderGeometry()
    const material = new THREE.MeshPhongMaterial({ color: 0x0000ff });
    const cube = new THREE.Mesh(g, material);

    cube.position.x = x * S;
    cube.position.z = y * S;
    cube.position.y += 0.25;
    cube.scale.set(1, 0.5, 1);

    scene.add(cube);

    const pointLight = new THREE.PointLight(0x000058, 1, 100);
    pointLight.position.set(x*S, 5, y*S);
    scene.add(pointLight);


}



const createBeer = (x, y) => {
    const g = new THREE.CylinderGeometry()
    const material = new THREE.MeshPhongMaterial({ color: 0xff3333 });
    const cube = new THREE.Mesh(g, material);

    cube.position.x = x * S;
    cube.position.z = y * S;

    cube.scale.set(0.3, 0.8, 0.3);

    scene.add(cube);

    robot.beers.push({
        obj: cube,
        lifetime: Math.random()*503
    });


    return cube;
}

const RESET = () => {
    robot.x = 0;obj: 
    robot.y = 0;
}

var layout = []
var freeFallingBeer = [];

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
        console.log(data)

        robot.target_a = DIRECTION[data["start-direction"]].a
        robot.state = SYNC;
        robot.action = "sleep"

        Object.keys(points).forEach(i => {
            const point = points[i]
            createNode(scene, point.x, point.y)
        })

    });
    eventSource.addEventListener("robot", (event) => {
        const data = JSON.parse(event.data);
        console.log(data);

        robot.target_x = data.x;
        robot.target_y = data.y;
        robot.orientation = data.direction;
        robot.target_a = DIRECTION[data.direction].a;

        robot.drinks = data.drinks;
        robot.action = data.action;

        if (robot.beers.length < data.drinks) {
            const count = data.drinks - robot.beers.length;
            for (let i = 0; i < count; i++) {
                createBeer(robot.x, robot.y);
            }
        }

        if ("value" in data) {
            robot.value = data.value;

            if (data.action == "rotate") {
                robot.target_a += data.value / 180 * PI;
            }
        }

        robot.state = SYNC;

    });
    eventSource.addEventListener("delivered", (event) => {
        const data = JSON.parse(event.data);
        console.log(data);
        
        for (let i = 0; i < data.count; i++) {
            const beer = robot.beers.pop();
            freeFallingBeer.push({
                beer: beer,
                vel: new THREE.Vector3(Math.cos(beer.lifetime), 1, Math.sin(beer.lifetime))
            });
        }
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
    // scene.add(floor);

    // Sky
    const skyboyG = new THREE.SphereGeometry(500, 60, 40);
    skyboyG.scale(-1, 1, 1);

    const loader = new THREE.TextureLoader();
    const texture = loader.load('../skybox.jpg')

    const skyMaterial = new THREE.MeshBasicMaterial({map: texture});

    const skybox = new THREE.Mesh(skyboyG, skyMaterial)

    scene.add(skybox);


    // const fgeometry = new THREE.PlaneGeometry(100, 100, 100, 100);

    // Modify the vertices to create a terrain effect
    // const noise = new Perlin();
    // for (let i = 0; i < fgeometry.vertices.length; i++) {
    //     const vertex = fgeometry.vertices[i];
    //     vertex.z = noise.simplex2(vertex.x / 20, vertex.y / 20) * 10;
    // }

    // fgeometry.computeVertexNormals(); // Recalculate normals for shading

    // // Create a material and mesh
    // const fmaterial = new THREE.MeshLambertMaterial({ color: 0x88cc88, wireframe: false });
    // const fterrain = new THREE.Mesh(fgeometry, fmaterial);
    // scene.add(terrain);

    // Light
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(5, 5, 5);
    // scene.add(pointLight);

    const ambientLight = new THREE.AmbientLight(0x888888);
    scene.add(ambientLight);

    camera.position.z = 5;
    camera.position.y = 3;

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.update();

    // Create a function to animate the scene
    function animate() {
        requestAnimationFrame(animate);

        robot.beers.forEach(beer => {
            beer.lifetime += 0.02;
            
            const xx = robotObj.position.x + Math.cos(beer.lifetime) * 2;
            const yy = 2 + Math.sin(beer.lifetime * 4) * 0.4;
            const zz = robotObj.position.z + Math.sin(beer.lifetime) * 2;

            beer.obj.position.x = lerp(beer.obj.position.x, xx, 0.1);
            beer.obj.position.y = lerp(beer.obj.position.y, yy, 0.1);
            beer.obj.position.z = lerp(beer.obj.position.z, zz, 0.1);
        });

        freeFallingBeer.forEach(beer => {
            beer.vel.multiplyScalar(0.9);
            beer.vel.y -= 0.1;
            beer.beer.obj.position.add(beer.vel);
        })

        // Handle Beers
        
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
            // robot.state = DONE;
            // return;
            if (robot.action == "move") {
                const target_x = robot.target_x + Math.cos(robot.target_a) * robot.value;
                const target_y = robot.target_y + Math.sin(robot.target_a) * robot.value;
                
                // robot.x = lerp(robot.x, target_x, 0.1);
                // robot.y = lerp(robot.y, target_y, 0.1);

                // const ang = Math.atan2(target_y - robot.y, target_x, - robot.x);
                robot.x += Math.cos(robot.target_a) * DDISPLACE;
                robot.y += Math.sin(robot.target_a) * DDISPLACE;

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
                // robot.a += Math.sign(robot.target_a - robot.a) * DANGLE
                robot.a += Math.sign(robot.value) * DANGLE;

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

        robotObj.rotation.y = -robot.a;
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
