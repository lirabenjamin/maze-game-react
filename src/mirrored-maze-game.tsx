import { useState, useRef, useEffect } from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';

const MirroredMazeGame = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const queryMirror = searchParams.get('mirror');
  const queryJitter = searchParams.get('jitter');
  const queryShowToggle = searchParams.get('showToggle');
  const showToggleButton = queryShowToggle !== 'false';
  const [mousePosition, setMousePosition] = useState({ x: 20, y: 20 });
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isGameCompleted, setIsGameCompleted] = useState(false);
  const [isMirrored, setIsMirrored] = useState(queryMirror !== 'false');
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
  const [showStartFlash, setShowStartFlash] = useState(false);
  const [showLossScreen, setShowLossScreen] = useState(false);
  const [movementStartTime, setMovementStartTime] = useState<number | null>(null);
  const [closestDistance, setClosestDistance] = useState<number>(Infinity);
  const gameAreaRef = useRef(null);
  const pathRef = useRef(null);
  const jitterAmount = queryJitter ? parseFloat(queryJitter) : 3;

  // Game configuration 
  const config = {
    width: 400,
    height: 400,
    startX: 20,
    startY: 20,
    endX: 380,
    endY: 380,
    pathWidth: 30
  };

  // Calculate distance between two points
  const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  };

  // Reset game
  const resetGame = () => {
    setMovementStartTime(null);
    setShowLossScreen(true);
    setTimeout(() => setShowLossScreen(false), 500);
    setMousePosition({ x: config.startX, y: config.startY });
    setIsGameStarted(false);
    setIsGameCompleted(false);
    setTimeLeft(60);
    setPoints(0);
    setClosestDistance(Infinity);
    setIsGameOver(false);
  };

  // Check if point is close enough to the path
  const isPointOnPath = (x: number, y: number): boolean => {
    if (!pathRef.current) return false;
  
    const svg = pathRef.current as SVGSVGElement;
    const path = svg.querySelector('path');
    if (!path) return false;
  
    const svgPoint = svg.createSVGPoint();
    svgPoint.x = x;
    svgPoint.y = y;
  
    try {
      return (path as any).isPointInStroke(svgPoint); // might not be typed
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
          setPoints(p => Math.max(0, p - 1));
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isGameStarted, isGameCompleted, isGameOver]);

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (isGameOver) return;
    if (!gameAreaRef.current) return;

    const rect = (gameAreaRef.current as HTMLDivElement).getBoundingClientRect();
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
        setMovementStartTime(Date.now());
        setMousePosition({ x: jitteredX, y: jitteredY });
        setShowStartFlash(true);
        setTimeout(() => setShowStartFlash(false), 500);
      }
      return;
    }

    // Check if point is on the path
    if (!isPointOnPath(jitteredX, jitteredY)) {
      const now = Date.now();
      if (movementStartTime && now - movementStartTime > 750) {
        resetGame();
      } else {
        // Silent reset without showing loss screen
        setMousePosition({ x: config.startX, y: config.startY });
        setIsGameStarted(false);
        setIsGameCompleted(false);
        setTimeLeft(60);
        setPoints(0);
        setClosestDistance(Infinity);
        setIsGameOver(false);
      }
      return;
    }

    // Update mouse position
    setMousePosition({ x: jitteredX, y: jitteredY });
    
    const distanceToEnd = calculateDistance(jitteredX, jitteredY, config.endX, config.endY);
    const maxDistance = calculateDistance(config.startX, config.startY, config.endX, config.endY);
    const progressRatio = 1 - Math.min(distanceToEnd / maxDistance, 1);
    const scaledPoints = Math.floor(progressRatio * 100);
    setPoints(scaledPoints);

    // Check if player reaches the end
    if (
      Math.abs(jitteredX - config.endX) < 20 && 
      Math.abs(jitteredY - config.endY) < 20
    ) {
      setIsGameCompleted(true);
      setTotalPoints(prev => prev + timeLeft + points);
      setClosestDistance(Infinity);
      setPoints(0);
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

  const renderCursor = () => {
    if (!isGameStarted) {
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
    }

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
    <div className="flex flex-col items-center justify-center p-4" style={{ paddingTop: '3rem' }}>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#000',
        color: '#39ff14',
        fontSize: '1.25rem',
        fontWeight: 'bold',
        padding: '0.75rem 0',
        fontFamily: 'monospace',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        zIndex: 1001
      }}>
        <div>Time left: {timeLeft}s</div>
        <div>Points: {points}</div>
        <div>Total Points: {totalPoints}</div>
      </div>

      {showLossScreen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(255, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          color: 'white',
          fontSize: '3rem',
          fontWeight: 'bold'
        }}>
          <p>YOU LOSE!</p>
          <p>TRY AGAIN!</p>
          
        </div>
      )}
      
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
        <div style={{ position: 'relative' }}>
          <svg 
            ref={pathRef} 
            width={config.width} 
            height={config.height} 
            style={{ border: '2px solid black', backgroundColor: '#f0f0f0' }}
          >
            {/* Path */}
            <path 
              d={pathPoints.map((point, index) =>
                index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
              ).join(' ')} 
              stroke="gray" 
              strokeWidth={config.pathWidth} 
              fill="none" 
            />
            <circle cx={config.startX} cy={config.startY} r={15} fill="green" />
            <circle cx={config.endX} cy={config.endY} r={15} fill="red" />
            <foreignObject x="0" y="0" width="400" height="400">
              <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: '100%', height: '100%', position: 'relative' }}>
                {!isGameStarted && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: '#1e40af',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    padding: '1rem 1.5rem',
                    borderRadius: '8px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    textAlign: 'center'
                  }}>
                    {isMirrored ? "Move your mouse to the red dot to begin." : "Move your mouse to the green dot to begin."}
                  </div>
                )}
                {showStartFlash && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: '#16a34a',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    padding: '1rem 1.5rem',
                    borderRadius: '8px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    textAlign: 'center'
                  }}>
                    Start!
                  </div>
                )}
              </div>
            </foreignObject>
          </svg>
        </div>
        {renderCursor()}
      </div>
      
      <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
}}>
      {showToggleButton && (
        <div className="mt-4 w-screen flex justify-center">
          <button 
            onClick={toggleMirroring} 
            className="bg-blue-500 text-white px-4 py-2 rounded flex items-center"
          >
            <RefreshCw className="mr-2" /> 
            {isMirrored ? 'Disable' : 'Enable'} Mirroring
          </button>
        </div>
      )}
      </div>
      
      {isGameCompleted && (
        <div className="mt-4 text-green-600 flex items-center">
          <CheckCircle2 className="mr-2" />
          Congratulations! You completed the maze!
        </div>
      )}
      
      {isGameOver && !isGameCompleted && (
        <div className="mt-4 text-red-600">Time's up! Try again!</div>
      )}
    </div>
  );
};

export default MirroredMazeGame;
