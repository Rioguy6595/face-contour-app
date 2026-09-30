"use client";

import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

function classifyFaceShape(landmarks, canvasWidth, canvasHeight) {
  const getPoint = (index) => ({
    x: landmarks[index].x * canvasWidth,
    y: landmarks[index].y * canvasHeight,
  });

  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const forehead = distance(getPoint(103), getPoint(332));
  const cheekbones = distance(getPoint(234), getPoint(454));
  const jaw = distance(getPoint(172), getPoint(397));
  const faceLength = distance(getPoint(10), getPoint(152));
  const jawlineLength = distance(getPoint(58), getPoint(288));

  const lengthToWidthRatio = faceLength / cheekbones;
  const jawToCheekRatio = jaw / cheekbones;
  const foreheadToCheekRatio = forehead / cheekbones;
  const jawSharpness = jawlineLength / jaw;

  if (lengthToWidthRatio > 1.55) {
    return "Oblong";
  }

  if (jawToCheekRatio > 0.9 && foreheadToCheekRatio > 0.9 && jawSharpness > 0.85) {
    return "Square";
  }

  if (foreheadToCheekRatio > 0.95 && jawToCheekRatio < 0.78) {
    return "Heart";
  }

  if (lengthToWidthRatio < 1.15 && jawToCheekRatio > 0.8 && jawSharpness < 0.85) {
    return "Round";
  }

  return "Oval";
}

function getContourTips(shape) {
  const tips = {
    Oval: "Your face shape is naturally balanced — light contour under the cheekbones and a touch on the jawline is enough to add definition.",
    Round: "Contour along the temples and under the cheekbones to add length and angles. Avoid contouring the round part of the cheeks directly.",
    Square: "Soften the jaw corners with contour and round out the temples slightly. Highlight the center of the forehead and chin to draw the eye inward.",
    Heart: "Contour the temples lightly since your forehead is wider, and highlight your narrower chin to balance proportions.",
    Oblong: "Contour the top of the forehead and the chin to visually shorten the face. Add blush horizontally across the cheeks rather than angled.",
  };
  return tips[shape] || "";
}

function getProductRecommendations(shape) {
  const products = {
    Oval: [
      { name: "Cream contour stick", note: "Easy blending for subtle definition" },
      { name: "Powder bronzer", note: "For everyday light warmth" },
    ],
    Round: [
      { name: "Angled contour brush", note: "Helps create sharper lines at the temples" },
      { name: "Matte contour palette", note: "Matte finish reads more natural for adding angles" },
    ],
    Square: [
      { name: "Cream highlighter", note: "Softens strong jaw corners when placed centrally" },
      { name: "Soft-edge contour brush", note: "Blends corners without harsh lines" },
    ],
    Heart: [
      { name: "Cream contour stick", note: "For light temple definition" },
      { name: "Pearl highlighter", note: "Brightens the chin to balance a wider forehead" },
    ],
    Oblong: [
      { name: "Matte bronzer", note: "For horizontal blush placement" },
      { name: "Contour palette (cool-toned)", note: "For forehead and chin shading" },
    ],
  };
  return products[shape] || [];
}

function drawContourOverlay(ctx, landmarks, canvasWidth, canvasHeight, shape) {
  const getPoint = (index) => ({
    x: landmarks[index].x * canvasWidth,
    y: landmarks[index].y * canvasHeight,
  });

  const drawZone = (points, color) => {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };

  const contourColor = "rgba(140, 80, 40, 0.65)";
  const highlightColor = "rgba(255, 223, 170, 0.55)";

  if (shape === "Round" || shape === "Square") {
    drawZone([getPoint(21), getPoint(54), getPoint(103), getPoint(67)], contourColor);
    drawZone([getPoint(251), getPoint(284), getPoint(332), getPoint(297)], contourColor);
    drawZone(
      [getPoint(127), getPoint(234), getPoint(93), getPoint(132), getPoint(58), getPoint(172)],
      contourColor
    );
    drawZone(
      [getPoint(356), getPoint(454), getPoint(323), getPoint(361), getPoint(288), getPoint(397)],
      contourColor
    );
  }

  if (shape === "Heart") {
    drawZone([getPoint(21), getPoint(54), getPoint(103), getPoint(67)], contourColor);
    drawZone([getPoint(251), getPoint(284), getPoint(332), getPoint(297)], contourColor);
    drawZone([getPoint(211), getPoint(152), getPoint(431), getPoint(377), getPoint(148)], highlightColor);
  }

  if (shape === "Oblong") {
    drawZone([getPoint(10), getPoint(109), getPoint(67), getPoint(297), getPoint(338)], contourColor);
    drawZone([getPoint(211), getPoint(152), getPoint(431), getPoint(377), getPoint(148)], contourColor);
  }

  if (shape === "Oval") {
    drawZone(
      [getPoint(127), getPoint(234), getPoint(93), getPoint(132), getPoint(58), getPoint(172)],
      contourColor
    );
    drawZone(
      [getPoint(356), getPoint(454), getPoint(323), getPoint(361), getPoint(288), getPoint(397)],
      contourColor
    );
  }
}

export default function FaceMesh() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const shapeHistoryRef = useRef([]);
  const captureRef = useRef(null);
  const [status, setStatus] = useState("Loading model...");
  const [faceShape, setFaceShape] = useState("");
  const [captured, setCaptured] = useState(null);

  useEffect(() => {
    let faceLandmarker;
    let animationId;
    let stream;

    async function setup() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        outputFaceBlendshapes: false,
        runningMode: "VIDEO",
        numFaces: 1,
      });

      setStatus("Requesting camera...");

      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;

      videoRef.current.addEventListener("loadeddata", () => {
        setStatus("Running");
        predictLoop();
      });
    }

    function predictLoop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      const ctx = canvas.getContext("2d");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const results = faceLandmarker.detectForVideo(video, performance.now());

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];

        const shape = classifyFaceShape(landmarks, canvas.width, canvas.height);

        shapeHistoryRef.current.push(shape);
        if (shapeHistoryRef.current.length > 30) {
          shapeHistoryRef.current.shift();
        }

        const counts = {};
        for (const s of shapeHistoryRef.current) {
          counts[s] = (counts[s] || 0) + 1;
        }
        const mostCommon = Object.keys(counts).reduce((a, b) =>
          counts[a] > counts[b] ? a : b
        );
        setFaceShape(mostCommon);
        drawContourOverlay(ctx, landmarks, canvas.width, canvas.height, mostCommon);
      }
      ctx.restore();

      animationId = requestAnimationFrame(predictLoop);
    }

    function captureSnapshot() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL("image/png");
      setCaptured(dataUrl);
    }
    captureRef.current = captureSnapshot;

    setup();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-[640px]">
      <p className="text-yellow-500 text-sm tracking-wide uppercase">{status}</p>

      {faceShape && (
        <h2 className="text-2xl font-semibold text-yellow-400">
          Detected face shape: <span className="text-white">{faceShape}</span>
        </h2>
      )}

      {faceShape && (
        <p className="text-gray-300 text-center max-w-[500px] text-sm md:text-base">
          {getContourTips(faceShape)}
        </p>
      )}

      {faceShape && (
        <div className="w-full max-w-[500px] bg-zinc-900 border border-yellow-500/40 rounded-lg p-4">
          <h3 className="text-yellow-400 text-sm font-semibold uppercase tracking-wide mb-2">
            Suggested products
          </h3>
          <ul className="space-y-2">
            {getProductRecommendations(faceShape).map((product, i) => (
              <li key={i} className="text-gray-300 text-sm">
                <span className="text-white font-medium">{product.name}</span>
                {" — "}
                {product.note}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="relative w-full rounded-xl overflow-hidden border-2 border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.3)]">
        <video ref={videoRef} autoPlay playsInline style={{ display: "none" }} />
        <canvas ref={canvasRef} className="w-full block" />
      </div>

      {faceShape && (
        <button
          onClick={() => captureRef.current && captureRef.current()}
          className="mt-2 px-6 py-2 rounded-full bg-yellow-500 text-black font-semibold tracking-wide hover:bg-yellow-400 transition"
        >
          Capture & Save
        </button>
      )}

      {captured && (
        <div className="flex flex-col items-center gap-2 mt-4">
          <p className="text-gray-400 text-sm">Your result:</p>
          <img
            src={captured}
            alt="Captured face contour result"
            className="rounded-lg border border-yellow-500 max-w-[300px]"
          />
          <a
            href={captured}
            download="face-contour-result.png"
            className="text-yellow-400 underline text-sm hover:text-yellow-300"
          >
            Download image
          </a>
        </div>
      )}
    </div>
  );
}