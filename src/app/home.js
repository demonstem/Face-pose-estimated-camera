import { useRef, useEffect, useState } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
export default function Home() {
  const [snapButtonText, setSnapbuttonText] = useState("loading");
  const [disableSnap, setDisableSnap] = useState(true);
  const videoRef = useRef(null);
  const photoRef = useRef(null);
  const facemeshRef = useRef(null);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [showFacemesh, setShowFacemesh] = useState(true);

  const [width, setWidth] = useState(null);
  const [height, setHeight] = useState(null);
  const [camWidth, setCamWidth] = useState(4);
  const [camHeight, setCamHeight] = useState(3);

  const [faceLandmarker, setFaceLandmarker] = useState(null);
  const [lastVideoTime, setLastVideoTime] = useState(-1);
  const [roll, setRoll] = useState(null);
  const [pitch, setPitch] = useState(null);
  const [yaw, setYaw] = useState(null);
  const threshold = 0.1;
  async function createFaceLandmarker() {
    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.7/wasm"
    );
    setFaceLandmarker(
      await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU",
        },
        outputFacialTransformationMatrixes: true,
        runningMode: "VIDEO",
        numFaces: 1,
      })
    );
  }

  async function detectLandmark() {
    setVideoDimensions();
    let startTimeMs = performance.now();
    if (
      videoRef.current &&
      videoRef.current.videoWidth &&
      videoRef.current.videoHeight &&
      videoRef.current.currentTime
    ) {
      if (faceLandmarker && lastVideoTime !== videoRef.current.currentTime) {
        setLastVideoTime(videoRef.current.currentTime);
        let results = await faceLandmarker.detectForVideo(
          videoRef.current,
          startTimeMs
        );
        if (
          results.facialTransformationMatrixes[0] &&
          results.facialTransformationMatrixes[0].data
        ) {
          let R = results.facialTransformationMatrixes[0].data;
          let tr = Math.atan2(R[9], R[10]).toFixed(2);
          let tp = Math.atan2(R[8], Math.sqrt(R[9] ** 2 + R[10] ** 2)).toFixed(
            2
          );
          let ty = Math.atan2(R[4], R[0]).toFixed(2);

          setRoll(tr);
          setPitch(tp);
          setYaw(ty);
          if (
            tr >= -threshold &&
            tr <= threshold &&
            tp >= -threshold &&
            tp <= threshold &&
            ty >= -threshold &&
            ty <= threshold
          ) {
            setDisableSnap(false);
          } else setDisableSnap(true);

          if (showFacemesh) {
            if (facemeshRef.current) {
              const ctx = facemeshRef.current.getContext("2d");
              const drawingUtils = new DrawingUtils(ctx);
              let twidth, theight;
              if (width > height) {
                twidth = height / (camHeight / camWidth);
                theight = height;
              } else {
                theight = width / (camWidth / camHeight);
                twidth = width;
              }
              ctx.canvas.width = twidth;
              ctx.canvas.height = theight;
              ctx.clearRect(
                0,
                0,
                facemeshRef.current.width,
                facemeshRef.current.height
              );
              for (const landmarks of results.faceLandmarks) {
                drawingUtils.drawConnectors(
                  landmarks,
                  FaceLandmarker.FACE_LANDMARKS_TESSELATION,
                  { color: "#C0C0C070", lineWidth: 1 }
                );
                drawingUtils.drawConnectors(
                  landmarks,
                  FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
                  { color: "#FF3030" }
                );
                drawingUtils.drawConnectors(
                  landmarks,
                  FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
                  { color: "#FF3030" }
                );
                drawingUtils.drawConnectors(
                  landmarks,
                  FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
                  { color: "#30FF30" }
                );
                drawingUtils.drawConnectors(
                  landmarks,
                  FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
                  { color: "#30FF30" }
                );
                drawingUtils.drawConnectors(
                  landmarks,
                  FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
                  { color: "#E0E0E0" }
                );
                drawingUtils.drawConnectors(
                  landmarks,
                  FaceLandmarker.FACE_LANDMARKS_LIPS,
                  { color: "#E0E0E0" }
                );
                drawingUtils.drawConnectors(
                  landmarks,
                  FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
                  { color: "#FF3030" }
                );
                drawingUtils.drawConnectors(
                  landmarks,
                  FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
                  { color: "#30FF30" }
                );
              }
            }
          }
        } else setDisableSnap(true);
      }
    }
    requestAnimationFrame(detectLandmark);
  }

  const getVideo = () => {
    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: width,
          height: height,
        },
      })
      .then((stream) => {
        let video = videoRef.current;
        video.srcObject = stream;
        video.play();
        setSnapbuttonText("take photo");
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        setCamWidth(settings.width);
        setCamHeight(settings.height);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const takePhoto = () => {
    let video = videoRef.current;
    let photo = photoRef.current;
    let twidth, theight;
    if (width > height) {
      twidth = height / (camHeight / camWidth);
      theight = height;
    } else {
      theight = width / (camWidth / camHeight);
      twidth = width;
    }
    photo.height = theight;
    photo.width = twidth;
    let ctx = photo.getContext("2d");
    ctx.drawImage(video, 0, 0, twidth, theight);
    setHasPhoto(true);
  };

  const cancelPhoto = () => {
    let photo = photoRef.current;
    let ctx = photo.getContext("2d");
    ctx.clearRect(0, 0, photo.width, photo.height);
    setHasPhoto(false);
  };

  const toggleFacemesh = () => {
    if (showFacemesh) {
      setShowFacemesh(false);
    } else {
      setShowFacemesh(true);
    }
  };

  const saveImage = () => {
    let downloadLink = document.createElement("a");
    downloadLink.setAttribute("download", "face.png");
    let dataURL = photoRef.current.toDataURL("image/png");
    let url = dataURL.replace(
      /^data:image\/png/,
      "data:application/octet-stream"
    );
    downloadLink.setAttribute("href", url);
    downloadLink.click();
  };

  function setVideoDimensions() {
    const video = videoRef.current;
    if (video) {
      const screenWidth = video.clientWidth;
      const screenHeight = video.clientHeight;
      const videoWidth = screenWidth;
      const videoHeight = screenHeight;
      setWidth(videoWidth);
      setHeight(videoHeight);
    }
  }

  useEffect(() => {
    createFaceLandmarker();
    getVideo();
  }, [videoRef]);

  useEffect(() => {
    detectLandmark();
  }, [faceLandmarker]);

  return (
    <div className="app">
      <div className="camera">
        <div className="logDisplay">
          <p>roll = {roll}</p>
          <p>pitch = {pitch}</p>
          <p>yaw = {yaw}</p>
          <p>camWidth = {camWidth}</p>
          <p>camHeight = {camHeight}</p>
          <p>width = {width}</p>
          <p>height = {height}</p>
        </div>
        <video
          className="video"
          ref={videoRef}
          style={{
            transform: "scaleX(-1)",
          }}
        ></video>
        {showFacemesh && (
          <canvas
            className="facemesh"
            ref={facemeshRef}
            style={{
              transform: "scaleX(-1)",
              height: width > height ? width / (camWidth / camHeight) : height,
              width: width > height ? height / (camHeight / camWidth) : width,
            }}
          ></canvas>
        )}
        <div>
          <button onClick={takePhoto} disabled={disableSnap}>
            {snapButtonText}
          </button>
          <button className="facemeshButton" onClick={toggleFacemesh}>
            Toggle Facemesh
          </button>
        </div>
        {roll < -threshold && !hasPhoto && (
          <div className="rollup">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75"
              />
            </svg>
          </div>
        )}
        {roll > threshold && !hasPhoto && (
          <div className="rolldown">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
              />
            </svg>
          </div>
        )}
        <div className="pitch">
          {pitch < -threshold && !hasPhoto && (
            <div className="pitchleft">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
            </div>
          )}
          {pitch > threshold && !hasPhoto && (
            <div className="pitchright">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </div>
          )}
        </div>
        <div className="yaw">
          {yaw < -threshold && !hasPhoto && (
            <div className="yawleft">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 4.5l-15 15m0 0h11.25m-11.25 0V8.25"
                />
              </svg>
            </div>
          )}
          {yaw > threshold && !hasPhoto && (
            <div className="yawright">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      <div className={"photo " + (hasPhoto ? "hasPhoto" : "")}>
        <canvas
          className="photoCanvas"
          ref={photoRef}
          style={{
            transform: "scaleX(-1)",
          }}
        ></canvas>
        <button onClick={saveImage}>save</button>
        <button className="cancelButton" onClick={cancelPhoto}>
          cancel
        </button>
      </div>
    </div>
  );
}
