// import * as THREE from 'three'

const PI = 3.14159265;

const createFloor = () => {

}

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
    floor.scale.set(10, 10, 10);
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

        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;


        controls.update();

        renderer.render(scene, camera);
    }

    // Start the animation loop
    animate();
}

window.onload = main;
