import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';

const MirroredMazeGame = () => {
  const [mousePosition, setMousePosition] = useState({ x: 20, y: 20 });
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isGameCompleted, setIsGameCompleted] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60);
  const [points, setPoints] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [pathPoints, setPathPoints] = useState([
    { x: 20, y: 20 },
    { x: 100, y: 100 },
    { x: 300, y: 50 },
    { x: 250, y: 200 },
    { x: 50, y: 250 },
    { x: 200, y: 350 },
    { x: 380, y: 380 }
  ]);
  const gameAreaRef = useRef(null);
  const pathRef = useRef(null);
  const jitterAmount = 0; // Adjust this value to control jitter intensity

  // Game configuration
  const config = {
    width: 400,
    height: 400,
    startX: 20,
    startY: 20,
    endX: 380,
    endY: 380,
    pathWidth: 50
  };

  // Calculate distance between two points
  const calculateDistance = (x1, y1, x2, y2) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  };

  // Reset game
  const resetGame = () => {
    setMousePosition({ x: config.startX, y: config.startY });
    setIsGameStarted(false);
    setIsGameCompleted(false);
    setTimeLeft(60);
    setPoints(0);
    setIsGameOver(false);
  };

  // Check if point is close enough to the path
  const isPointOnPath = (x, y) => {
    if (!pathRef.current) return false;
    
    const svg = pathRef.current;
    const path = svg.querySelector('path');
    
    // Create SVG point
    const svgPoint = svg.createSVGPoint();
    svgPoint.x = x;
    svgPoint.y = y;

    try {
      // Check if point is on the path stroke
      return path.isPointInStroke(svgPoint);
    } catch (error) {
      console.error('Path intersection check failed', error);
      return true;
    }
  };

  // Timer logic
  useEffect(() => {
    if (isGameStarted && !isGameCompleted && !isGameOver) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsGameOver(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isGameStarted, isGameCompleted, isGameOver]);

  // Handle mouse move
  const handleMouseMove = (e) => {
    if (isGameOver) return;
    if (!gameAreaRef.current) return;

    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Ensure coordinates are within game area
    const clampedX = Math.max(0, Math.min(x, config.width));
    const clampedY = Math.max(0, Math.min(y, config.height));

    // Mirror the mouse movement if mirrored mode is on
    const mirroredX = isMirrored ? config.width - clampedX : clampedX;
    const mirroredY = isMirrored ? config.height - clampedY : clampedY;

    const jitterX = (Math.random() - 0.5) * jitterAmount;
    const jitterY = (Math.random() - 0.5) * jitterAmount;

    const jitteredX = Math.max(0, Math.min(config.width, mirroredX + jitterX));
    const jitteredY = Math.max(0, Math.min(config.height, mirroredY + jitterY));

    // If game not started, only allow movement from start point
    if (!isGameStarted) {
      // Check if close to start point
      const distanceToStart = calculateDistance(
        jitteredX, jitteredY, 
        config.startX, config.startY
      );

      if (distanceToStart <= config.pathWidth) {
        setIsGameStarted(true);
        setMousePosition({ x: jitteredX, y: jitteredY });
      }
      return;
    }

    // Check if point is on the path
    if (!isPointOnPath(jitteredX, jitteredY)) {
      // Reset if off the path
      resetGame();
      return;
    }

    // Update mouse position
    setMousePosition({ x: jitteredX, y: jitteredY });

    // Check if player reaches the end
    if (
      Math.abs(jitteredX - config.endX) < 20 && 
      Math.abs(jitteredY - config.endY) < 20
    ) {
      setIsGameCompleted(true);
      setTotalPoints(prev => prev + timeLeft);
      setPathPoints([
        { x: config.startX, y: config.startY },
        ...Array.from({ length: 5 }, () => ({
          x: Math.random() * (config.width - 40) + 20,
          y: Math.random() * (config.height - 40) + 20
        }))
        .sort((a, b) => calculateDistance(config.startX, config.startY, a.x, a.y) - calculateDistance(config.startX, config.startY, b.x, b.y)),
        { x: config.endX, y: config.endY }
      ]);
    }
  };

  // Toggle mirroring
  const toggleMirroring = () => {
    setIsMirrored(!isMirrored);
  };

  // Create path SVG
  const createPath = () => {
    // Create path string
    const pathString = pathPoints.map((point, index) => 
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
    ).join(' ');

    return (
      <svg 
        ref={pathRef} 
        width={config.width} 
        height={config.height} 
        style={{ border: '2px solid black', backgroundColor: '#f0f0f0' }}
      >
        {/* Path */}
        <path 
          d={pathString} 
          stroke="gray" 
          strokeWidth={config.pathWidth} 
          fill="none" 
        />

        {/* Start point */}
        <circle 
          cx={config.startX} 
          cy={config.startY} 
          r={15} 
          fill="green" 
        />

        {/* End point */}
        <circle 
          cx={config.endX} 
          cy={config.endY} 
          r={15} 
          fill="red" 
        />
      </svg>
    );
  };

  // Player cursor
  const renderCursor = () => {
    if (!isGameStarted) return (
      <div
        style={{
          position: 'absolute',
          left: mousePosition.x - 10,
          top: mousePosition.y - 10,
          width: 20,
          height: 20,
          borderRadius: '50%',
          backgroundColor: 'blue',
          pointerEvents: 'none'
        }}
      />
    );

    const distanceToEnd = calculateDistance(mousePosition.x, mousePosition.y, config.endX, config.endY);
    if (distanceToEnd <= 10) return null;

    return (
      <div
        style={{
          position: 'absolute',
          left: mousePosition.x - 10,
          top: mousePosition.y - 10,
          width: 20,
          height: 20,
          borderRadius: '50%',
          backgroundColor: 'blue',
          pointerEvents: 'none'
        }}
      />
    );
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-4">Mirrored Maze Game</h1>
      
      <div 
        ref={gameAreaRef}
        onMouseMove={handleMouseMove}
        style={{ 
          position: 'relative', 
          width: config.width, 
          height: config.height,
          cursor: isGameStarted ? 'none' : 'default'
        }}
      >
        {createPath()}
        {renderCursor()}
      </div>

      <div className="mt-4 flex items-center space-x-4">
        <button 
          onClick={toggleMirroring} 
          className="bg-blue-500 text-white px-4 py-2 rounded flex items-center"
        >
          <RefreshCw className="mr-2" /> 
          {isMirrored ? 'Disable' : 'Enable'} Mirroring
        </button>

        <button 
          onClick={resetGame} 
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Reset Game
        </button>
      </div>

      {isGameCompleted && (
        <div className="mt-4 text-green-600 flex items-center">
          <CheckCircle2 className="mr-2" />
          Congratulations! You completed the maze!
        </div>
      )}

      <div className="mt-2">Time left: {timeLeft}s</div>
      <div className="mt-2">Points: {points}</div>
      <div className="mt-2">Total Points: {totalPoints}</div>

      {isGameOver && !isGameCompleted && (
        <div className="mt-4 text-red-600">Time's up! Try again!</div>
      )}

      <div className="mt-4 text-center">
        <p>Navigate from the green start point to the red end point.</p>
        <p>The movement is {isMirrored ? 'mirrored' : 'normal'}!</p>
        <p>You must start from the green point!</p>
      </div>
    </div>
  );
};

export default MirroredMazeGame;
