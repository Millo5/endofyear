// import * as THREE from 'three'

// Reference
var LAYOUT = {
    "pickup-point": "a",
    "start-direction": "east",
    "points": {
        "a": {
            "x": 1,
            "y": 1,
            "east": "b",
            "south": "d"
        },
        "b": {
            "x": 2,
            "y": 1,
            "south": "c",
            "west": "a"
        },
        "c": {
            "x": 2,
            "y": 3,
            "west": "d",
            "north": "b",
            "east": "e"
        },
        "d": {
            "x": 1,
            "y": 3,
            "north": "a",
            "east": "c"
        },
        "e": {
            "x": 4,
            "y": 3,
            "west": "c"
        }
    }
}



const S = 8;
const PI = 3.14159265;

const createNode = (scene, x, y) => {
    const g = new THREE.CylinderGeometry()
    const material = new THREE.MeshPhongMaterial({ color: 0x0000ff });
    const cube = new THREE.Mesh(g, material);

    cube.position.x = x * S;
    cube.position.z = y * S;

    scene.add(cube);
}


const RESET = () => {
    robot.x = 0;
    robot.y = 0;
    robot.count = 0;
}


var robot = {
    x: 0,
    y: 0,
    count: 0
}

RESET();

const main = () => {
    // Set up the scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas') });

    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Add the cube to the scene
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshPhongMaterial({ color: 0x00ffff });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Add the floor
    const floor_g = new THREE.PlaneGeometry();
    const floor = new THREE.Mesh(floor_g, material);
    floor.scale.set(100, 100, 100);
    floor.rotation.x = -PI/2;
    scene.add(floor);


    createNode(scene, 0, 0);
    createNode(scene, 0, 1);
    createNode(scene, 1, 0);


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

        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;


        controls.update();

        renderer.render(scene, camera);
    }

    // Start the animation loop
    animate();
}

window.onload = main;





// init: 
/*


*/
