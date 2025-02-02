import "./style.scss";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import smokeVertexShader from "./shaders/smoke/vertex.glsl";
import smokeFragmentShader from "./shaders/smoke/fragment.glsl";
import gsap from "gsap";
import { Howl } from "howler";

const canvas = document.querySelector("#experience-canvas");
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

const modals = {
  work: document.querySelector(".modal.work"),
  about: document.querySelector(".modal.about"),
  contact: document.querySelector(".modal.contact"),
};

const overlay = document.querySelector(".overlay");

let touchHappened = false;
overlay.addEventListener(
  "touchend",
  (e) => {
    touchHappened = true;
    e.preventDefault();
    const modal = document.querySelector('.modal[style*="display: block"]');
    if (modal) hideModal(modal);
  },
  { passive: false }
);

overlay.addEventListener(
  "click",
  (e) => {
    if (touchHappened) return;
    e.preventDefault();
    const modal = document.querySelector('.modal[style*="display: block"]');
    if (modal) hideModal(modal);
  },
  { passive: false }
);

document.querySelectorAll(".modal-exit-button").forEach((button) => {
  button.addEventListener(
    "touchend",
    (e) => {
      touchHappened = true;
      e.preventDefault();
      const modal = e.target.closest(".modal");
      hideModal(modal);
    },
    { passive: false }
  );

  button.addEventListener(
    "click",
    (e) => {
      if (touchHappened) return;
      e.preventDefault();
      const modal = e.target.closest(".modal");
      hideModal(modal);
    },
    { passive: false }
  );
});

let isModalOpen = false;

const showModal = (modal) => {
  modal.style.display = "block";
  overlay.style.display = "block";

  isModalOpen = true;
  controls.enabled = false;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableRotate = false;

  if (currentHoveredObject) {
    playHoverAnimation(currentHoveredObject, false);
    currentHoveredObject = null;
  }
  document.body.style.cursor = "default";
  currentIntersects = [];

  gsap.set(modal, {
    opacity: 0,
    scale: 0,
  });
  gsap.set(overlay, {
    opacity: 0,
  });

  gsap.to(overlay, {
    opacity: 1,
    duration: 0.5,
  });

  gsap.to(modal, {
    opacity: 1,
    scale: 1,
    duration: 0.5,
    ease: "back.out(2)",
  });
};

const hideModal = (modal) => {
  isModalOpen = false;
  controls.enabled = true;

  gsap.to(overlay, {
    opacity: 0,
    duration: 0.5,
  });

  gsap.to(modal, {
    opacity: 0,
    scale: 0,
    duration: 0.5,
    ease: "back.in(2)",
    onComplete: () => {
      modal.style.display = "none";
      overlay.style.display = "none";
    },
  });
};

const xAxisFans = [];
const yAxisFans = [];

const raycasterObjects = [];
let currentIntersects = [];
let currentHoveredObject = null;

const socialLinks = {
  GitHub: "https://github.com/",
  YouTube: "https://www.youtube.com/",
  Twitter: "https://www.twitter.com/",
};

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// Loaders
const textureLoader = new THREE.TextureLoader();

// Model Loaders
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

const environmentMap = new THREE.CubeTextureLoader()
  .setPath("textures/skybox/")
  .load(["px.webp", "nx.webp", "py.webp", "ny.webp", "pz.webp", "nz.webp"]);

const textureMap = {
  First: {
    day: "/textures/room/day/first_texture_set_day.webp",
    night: "/textures/room/night/first_texture_set_night.webp",
  },
  Second: {
    day: "/textures/room/day/second_texture_set_day.webp",
    night: "/textures/room/night/second_texture_set_night.webp",
  },
  Third: {
    day: "/textures/room/day/third_texture_set_day.webp",
    night: "/textures/room/night/third_texture_set_night.webp",
  },
  Fourth: {
    day: "/textures/room/day/fourth_texture_set_day.webp",
    night: "/textures/room/night/fourth_texture_set_night.webp",
  },
};

const loadedTextures = {
  day: {},
  night: {},
};

Object.entries(textureMap).forEach(([key, paths]) => {
  const dayTexture = textureLoader.load(paths.day);
  dayTexture.flipY = false;
  dayTexture.colorSpace = THREE.SRGBColorSpace;
  loadedTextures.day[key] = dayTexture;

  const nightTexture = textureLoader.load(paths.night);
  nightTexture.flipY = false;
  nightTexture.colorSpace = THREE.SRGBColorSpace;
  loadedTextures.night[key] = nightTexture;
});

// Reuseable Materials
const glassMaterial = new THREE.MeshPhysicalMaterial({
  transmission: 1,
  opacity: 1,
  metalness: 0,
  roughness: 0,
  ior: 1.5,
  thickness: 0.01,
  specularIntensity: 1,
  envMap: environmentMap,
  envMapIntensity: 1,
  depthWrite: false,
});

const whiteMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
});

const videoElement = document.createElement("video");
videoElement.src = "/textures/video/Screen.mp4";
videoElement.loop = true;
videoElement.muted = true;
videoElement.playsInline = true;
videoElement.autoplay = true;
videoElement.play();

const videoTexture = new THREE.VideoTexture(videoElement);
videoTexture.colorSpace = THREE.SRGBColorSpace;
videoTexture.flipY = false;

window.addEventListener("mousemove", (e) => {
  touchHappened = false;
  pointer.x = (e.clientX / sizes.width) * 2 - 1;
  pointer.y = -(e.clientY / sizes.height) * 2 + 1;
});

window.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    pointer.x = (e.touches[0].clientX / sizes.width) * 2 - 1;
    pointer.y = -(e.touches[0].clientY / sizes.height) * 2 + 1;
  },
  { passive: false }
);

window.addEventListener(
  "touchend",
  (e) => {
    e.preventDefault();
    handleRaycasterInteraction();
  },
  { passive: false }
);

// Piano key mapping
const pianoKeyMap = {
  C1_Key: "Key_24",
  "C#1_Key": "Key_23",
  D1_Key: "Key_22",
  "D#1_Key": "Key_21",
  E1_Key: "Key_20",
  F1_Key: "Key_19",
  "F#1_Key": "Key_18",
  G1_Key: "Key_17",
  "G#1_Key": "Key_16",
  A1_Key: "Key_15",
  "A#1_Key": "Key_14",
  B1_Key: "Key_13",
  C2_Key: "Key_12",
  "C#2_Key": "Key_11",
  D2_Key: "Key_10",
  "D#2_Key": "Key_9",
  E2_Key: "Key_8",
  F2_Key: "Key_7",
  "F#2_Key": "Key_6",
  G2_Key: "Key_5",
  "G#2_Key": "Key_4",
  A2_Key: "Key_3",
  "A#2_Key": "Key_2",
  B2_Key: "Key_1",
};

const pianoSounds = {};

Object.values(pianoKeyMap).forEach((soundKey) => {
  pianoSounds[soundKey] = new Howl({
    src: [`/audio/sfx/piano/${soundKey}.ogg`],
    preload: true,
    volume: 0.5,
  });
});

function handleRaycasterInteraction() {
  if (currentIntersects.length > 0) {
    const object = currentIntersects[0].object;

    Object.entries(pianoKeyMap).forEach(([keyName, soundKey]) => {
      if (object.name.includes(keyName)) {
        pianoSounds[soundKey].play();

        gsap.to(object.rotation, {
          x: object.userData.initialRotation.x + Math.PI / 42,
          duration: 0.5,
          ease: "back.out(2)",
          onComplete: () => {
            gsap.to(object.rotation, {
              x: object.userData.initialRotation.x,
              duration: 0.2,
              ease: "power2.out",
            });
          },
        });

        gsap.to(object.scale, {
          x: object.userData.initialScale.x * 1.1,
          y: object.userData.initialScale.y * 1.1,
          // z: object.userData.initialScale.z * 1.1,
          duration: 0.2,
          ease: "power2.out",
          onComplete: () => {
            gsap.to(object.scale, {
              x: object.userData.initialScale.x,
              y: object.userData.initialScale.y,
              // z: object.userData.initialScale.z,
              duration: 0.2,
              ease: "power2.out",
            });
          },
        });
      }
    });

    Object.entries(socialLinks).forEach(([key, url]) => {
      if (object.name.includes(key)) {
        const newWindow = window.open();
        newWindow.opener = null;
        newWindow.location = url;
        newWindow.target = "_blank";
        newWindow.rel = "noopener noreferrer";
      }
    });

    if (object.name.includes("Work_Button")) {
      showModal(modals.work);
    } else if (object.name.includes("About_Button")) {
      showModal(modals.about);
    } else if (object.name.includes("Contact_Button")) {
      showModal(modals.contact);
    }
  }
}

window.addEventListener("click", handleRaycasterInteraction);

let fish;
let coffeePosition;
let hourHand;
let minuteHand;

loader.load("/models/Room_Portfolio.glb", (glb) => {
  glb.scene.traverse((child) => {
    if (child.isMesh) {
      if (child.name.includes("Fish")) {
        fish = child;
        child.userData.initialPosition = new THREE.Vector3().copy(
          child.position
        );
      }

      if (child.name.includes("Hour_Hand")) {
        hourHand = child;
        child.userData.initialRotation = new THREE.Euler().copy(child.rotation);
      }

      if (child.name.includes("Minute_Hand")) {
        minuteHand = child;
        child.userData.initialRotation = new THREE.Euler().copy(child.rotation);
      }

      if (child.name.includes("Coffee")) {
        coffeePosition = child.position.clone();
      }

      if (child.name.includes("Raycaster")) {
        raycasterObjects.push(child);
      }

      if (child.name.includes("Hover") || child.name.includes("Key")) {
        child.userData.initialScale = new THREE.Vector3().copy(child.scale);
        child.userData.initialPosition = new THREE.Vector3().copy(
          child.position
        );
        child.userData.initialRotation = new THREE.Euler().copy(child.rotation);
      }

      if (child.name.includes("Water")) {
        child.material = new THREE.MeshBasicMaterial({
          color: 0x558bc8,
          transparent: true,
          opacity: 0.66,
          depthWrite: false,
        });
      } else if (child.name.includes("Glass")) {
        child.material = glassMaterial;
      } else if (child.name.includes("Bubble")) {
        child.material = whiteMaterial;
      } else if (child.name.includes("Screen")) {
        child.material = new THREE.MeshBasicMaterial({
          map: videoTexture,
        });
      } else {
        Object.keys(textureMap).forEach((key) => {
          if (child.name.includes(key)) {
            const material = new THREE.MeshBasicMaterial({
              map: loadedTextures.day[key],
            });

            child.material = material;

            if (child.name.includes("Fan")) {
              if (
                child.name.includes("Fan_2") ||
                child.name.includes("Fan_4")
              ) {
                xAxisFans.push(child);
              } else {
                yAxisFans.push(child);
              }
            }

            if (child.material.map) {
              child.material.map.minFilter = THREE.LinearFilter;
            }
          }
        });
      }
    }
  });

  if (coffeePosition) {
    smoke.position.set(
      coffeePosition.x,
      coffeePosition.y + 0.2,
      coffeePosition.z
    );
  }

  scene.add(glb.scene);
});

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  35,
  sizes.width / sizes.height,
  0.1,
  1000
);
camera.position.set(18.308497815998255, 8.340313483552896, 16.733946926439422);

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.update();
controls.target.set(
  -0.04451427016691359,
  1.992258015338971,
  -0.26919808674082935
);

// Shader Stuffffffffff
const smokeGeometry = new THREE.PlaneGeometry(1, 1, 16, 64);
smokeGeometry.translate(0, 0.5, 0);
smokeGeometry.scale(0.33, 1, 0.33);

const perlinTexture = textureLoader.load("/shaders/perlin.png");
perlinTexture.wrapS = THREE.RepeatWrapping;
perlinTexture.wrapT = THREE.RepeatWrapping;

const smokeMaterial = new THREE.ShaderMaterial({
  vertexShader: smokeVertexShader,
  fragmentShader: smokeFragmentShader,
  uniforms: {
    uTime: new THREE.Uniform(0),
    uPerlinTexture: new THREE.Uniform(perlinTexture),
  },
  side: THREE.DoubleSide,
  transparent: true,
  depthWrite: false,
});

const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);
smoke.position.y = 1.83;
scene.add(smoke);

// Event Listeners
window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update Camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

function playHoverAnimation(object, isHovering) {
  gsap.killTweensOf(object.scale);
  gsap.killTweensOf(object.rotation);
  gsap.killTweensOf(object.position);

  if (object.name.includes("Coffee")) {
    gsap.killTweensOf(smoke.scale);
    if (isHovering) {
      gsap.to(smoke.scale, {
        x: 1.4,
        y: 1.4,
        z: 1.4,
        duration: 0.5,
        ease: "back.out(2)",
      });
    } else {
      gsap.to(smoke.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.3,
        ease: "back.out(2)",
      });
    }
  }

  if (isHovering) {
    // Scale animation for all objects
    gsap.to(object.scale, {
      x: object.userData.initialScale.x * 1.4,
      y: object.userData.initialScale.y * 1.4,
      z: object.userData.initialScale.z * 1.4,
      duration: 0.5,
      ease: "back.out(2)",
    });

    if (object.name.includes("About_Button")) {
      gsap.to(object.rotation, {
        x: object.userData.initialRotation.x - Math.PI / 10,
        duration: 0.5,
        ease: "back.out(2)",
      });
    } else if (
      object.name.includes("Contact_Button") ||
      object.name.includes("My_Work_Button") ||
      object.name.includes("GitHub") ||
      object.name.includes("YouTube") ||
      object.name.includes("Twitter")
    ) {
      gsap.to(object.rotation, {
        x: object.userData.initialRotation.x + Math.PI / 10,
        duration: 0.5,
        ease: "back.out(2)",
      });
    }

    if (object.name.includes("Boba") || object.name.includes("Name_Letter")) {
      gsap.to(object.position, {
        y: object.userData.initialPosition.y + 0.2,
        duration: 0.5,
        ease: "back.out(2)",
      });
    }
  } else {
    // Reset scale for all objects
    gsap.to(object.scale, {
      x: object.userData.initialScale.x,
      y: object.userData.initialScale.y,
      z: object.userData.initialScale.z,
      duration: 0.3,
      ease: "back.out(2)",
    });

    if (
      object.name.includes("About_Button") ||
      object.name.includes("Contact_Button") ||
      object.name.includes("My_Work_Button") ||
      object.name.includes("GitHub") ||
      object.name.includes("YouTube") ||
      object.name.includes("Twitter")
    ) {
      gsap.to(object.rotation, {
        x: object.userData.initialRotation.x,
        duration: 0.3,
        ease: "back.out(2)",
      });
    }

    if (object.name.includes("Boba") || object.name.includes("Name_Letter")) {
      gsap.to(object.position, {
        y: object.userData.initialPosition.y,
        duration: 0.3,
        ease: "back.out(2)",
      });
    }
  }
}

// Render
const clock = new THREE.Clock();

const updateClockHands = () => {
  if (!hourHand || !minuteHand) return;

  const now = new Date();
  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const minuteAngle = (minutes + seconds / 60) * ((Math.PI * 2) / 60);

  const hourAngle = (hours + minutes / 60) * ((Math.PI * 2) / 12);

  minuteHand.rotation.x = -minuteAngle;
  hourHand.rotation.x = -hourAngle;
};

const render = (timestamp) => {
  const elapsedTime = clock.getElapsedTime();
  smokeMaterial.uniforms.uTime.value = elapsedTime;

  controls.update();

  updateClockHands();

  // console.log(camera.position);
  // console.log("000000000");
  // console.log(controls.target);

  // Animate Fans
  xAxisFans.forEach((fan) => {
    fan.rotation.x += 0.04;
  });

  yAxisFans.forEach((fan) => {
    fan.rotation.y += 0.04;
  });

  // Fish
  if (fish) {
    const time = timestamp * 0.001;
    const amplitude = 0.12;
    const position =
      amplitude * Math.sin(time) * (1 - Math.abs(Math.sin(time)) * 0.1);
    fish.position.y = fish.userData.initialPosition.y + position;
  }

  // Raycaster
  if (!isModalOpen) {
    raycaster.setFromCamera(pointer, camera);

    // calculate objects intersecting the picking ray
    currentIntersects = raycaster.intersectObjects(raycasterObjects);

    for (let i = 0; i < currentIntersects.length; i++) {}

    if (currentIntersects.length > 0) {
      const currentIntersectObject = currentIntersects[0].object;

      if (currentIntersectObject.name.includes("Hover")) {
        if (currentIntersectObject !== currentHoveredObject) {
          if (currentHoveredObject) {
            playHoverAnimation(currentHoveredObject, false);
          }

          playHoverAnimation(currentIntersectObject, true);
          currentHoveredObject = currentIntersectObject;
        }
      }

      if (currentIntersectObject.name.includes("Pointer")) {
        document.body.style.cursor = "pointer";
      } else {
        document.body.style.cursor = "default";
      }
    } else {
      if (currentHoveredObject) {
        playHoverAnimation(currentHoveredObject, false);
        currentHoveredObject = null;
      }
      document.body.style.cursor = "default";
    }
  }

  renderer.render(scene, camera);

  window.requestAnimationFrame(render);
};

render();
