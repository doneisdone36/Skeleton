import React, { useEffect, useRef } from 'react';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';

function ProjectsFormComponent() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;

    const setupCamera = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { frameRate: 60, width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        });
        if (videoElement) {
          videoElement.srcObject = stream;
          await new Promise((resolve) => {
            videoElement.addEventListener('loadeddata', resolve);
          });
        }
      }
    };

    let detectHands: (() => void) | null = null;

    const setupHands = () => {
      const hands = new Hands({
        locateFile: (file: any) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      hands.onResults((results) => {
        detectHands = () => {
          if( canvasElement ) {
            const ctx = canvasElement.getContext('2d');
          if (canvasElement && ctx && results.multiHandLandmarks) {
            // ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            for (const landmarks of results.multiHandLandmarks) {
              for (const landmark of landmarks) {
                ctx.beginPath();
                ctx.arc(landmark.x * canvasElement.width, landmark.y * canvasElement.height, 5, 0, 2 * Math.PI);
                ctx.fillStyle = 'blue';
                ctx.fill();
              }
            }
          }
          }
        }
      });

      if (videoElement) {
        const camera = new Camera(videoElement, {
          onFrame: async () => {
            await hands.send({ image: videoElement });
          },
          width: 640,
          height: 480
        });
        camera.start();
      }
    };

    const detectPose = async () => {
      let previousTimestamp: number | null = null;
      const targetFPS = 60; 

      const detectConfig = {
        modelType : poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
        // enableTracking: true,
      }

      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectConfig
      );

      if (videoElement && canvasElement) {
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        const ctx = canvasElement.getContext('2d');
        const detect = async (timestamp: number) => {
          if (previousTimestamp == null || timestamp - previousTimestamp >= (1000 / targetFPS)) {
            previousTimestamp = timestamp;
            const poses = await detector.estimatePoses(videoElement);
            if (ctx) {
              ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
              poses.forEach(pose => {
                pose.keypoints.forEach(keypoint => {
                  if (keypoint.score !== undefined && keypoint.score > 0.5) {
                    const x = keypoint.x;
                    const y = keypoint.y;

                    ctx.beginPath();
                    ctx.arc(x, y, 5, 0, 2 * Math.PI);
                    ctx.fillStyle = 'aqua';
                    console.log("ctx fill")
                    ctx.fill();
                  }
                });

                const connectedParts = [
                    //머리
                    [pose.keypoints[0], pose.keypoints[1]],
                    [pose.keypoints[0], pose.keypoints[2]],
                    // 어깨
                    [pose.keypoints[5], pose.keypoints[6]],
                    // 왼쪽 팔
                    [pose.keypoints[5], pose.keypoints[7]],
                    [pose.keypoints[7], pose.keypoints[9]],
                    // 오른쪽 팔
                    [pose.keypoints[6], pose.keypoints[8]],
                    [pose.keypoints[8], pose.keypoints[10]],
                    // 상체
                    [pose.keypoints[5], pose.keypoints[11]],
                    [pose.keypoints[6], pose.keypoints[12]],
                    [pose.keypoints[11], pose.keypoints[12]],
                    // 왼쪽 다리
                    [pose.keypoints[11], pose.keypoints[13]],
                    [pose.keypoints[13], pose.keypoints[15]],
                    // 오른쪽 다리
                    [pose.keypoints[12], pose.keypoints[14]],
                    [pose.keypoints[14], pose.keypoints[16]]
                ];

                connectedParts.forEach(([keypoint1, keypoint2]) => {
                  if (keypoint1.score && keypoint2.score !== undefined && keypoint1.score > 0.5 && keypoint2.score > 0.5) {
                    ctx.beginPath();
                    ctx.moveTo(keypoint1.x, keypoint1.y);
                    ctx.lineTo(keypoint2.x, keypoint2.y);
                    ctx.strokeStyle = 'red';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                  }
                }); 
              });
              if (detectHands) {
                detectHands();
              }
            }
            requestAnimationFrame(detect);
          }          
        };
        requestAnimationFrame(detect);
      }
    };

    setupCamera().then(() => {
      setupHands();
      detectPose();
    });

    
  }, []);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <video ref={videoRef} autoPlay playsInline style={{ width: '50%', height: '100%' }} />
      <canvas ref={canvasRef} style={{ width: '50%', height: '100%' }} />
    </div>
  );
}

const ProjectsForm = React.memo(ProjectsFormComponent)
export default ProjectsForm;
