import { useState, useEffect, useCallback, useRef } from "react";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, Trophy, Clock, Grid3x3, LayoutGrid, Table2, ChevronRight, Puzzle, CheckCircle2 } from "lucide-react";

const IMAGE_SRC = "/images/taj-mahal-puzzle.png";

const DIFFICULTIES = [
  { label: "Easy", size: 3, icon: Grid3x3, reward: 5 },
  { label: "Medium", size: 4, icon: LayoutGrid, reward: 10 },
  { label: "Hard", size: 5, icon: Table2, reward: 20 },
];

interface Tile {
  id: number;
  correctPos: number;
  currentPos: number;
  bgX: string;
  bgY: string;
  bgSize: string;
}

function createTiles(size: number): Tile[] {
  const tiles: Tile[] = [];
  const step = 100 / (size - 1);
  for (let i = 0; i < size * size; i++) {
    const row = Math.floor(i / size);
    const col = i % size;
    tiles.push({
      id: i,
      correctPos: i,
      currentPos: i,
      bgX: `${col * step}%`,
      bgY: `${row * step}%`,
      bgSize: `${size * 100}%`,
    });
  }
  return tiles;
}

function shuffleTiles(size: number): Tile[] {
  const tiles = createTiles(size);
  let shuffled: number[];
  do {
    shuffled = Array.from({ length: size * size }, (_, i) => i);
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
  } while (isSolved(shuffled, size));

  return tiles.map((t, i) => ({ ...t, currentPos: shuffled[i] }));
}

function isSolved(positions: number[], size: number): boolean {
  for (let i = 0; i < positions.length; i++) {
    const row = Math.floor(i / size);
    const col = i % size;
    const correctId = row * size + col;
    if (positions[i] !== correctId) return false;
  }
  return true;
}

export default function PuzzleGame() {
  const { toast } = useToast();
  const [difficulty, setDifficulty] = useState(0);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [timer, setTimer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSolvedState, setIsSolvedState] = useState(false);
  const [moves, setMoves] = useState(0);
  const [bestTimes, setBestTimes] = useState<Record<number, number>>({});
  const [imageLoaded, setImageLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const size = DIFFICULTIES[difficulty].size;

  const startGame = useCallback(() => {
    const shuffled = shuffleTiles(size);
    setTiles(shuffled);
    setTimer(0);
    setMoves(0);
    setIsPlaying(true);
    setIsSolvedState(false);
    setSelectedTile(null);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
  }, [size]);

  const stopGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleTileClick = (index: number) => {
    if (!isPlaying || isSolvedState) return;

    if (selectedTile === null) {
      setSelectedTile(index);
      return;
    }

    if (selectedTile === index) {
      setSelectedTile(null);
      return;
    }

    // Swap tiles
    const newTiles = [...tiles];
    const temp = newTiles[selectedTile].currentPos;
    newTiles[selectedTile] = { ...newTiles[selectedTile], currentPos: newTiles[index].currentPos };
    newTiles[index] = { ...newTiles[index], currentPos: temp };
    setTiles(newTiles);
    setSelectedTile(null);
    setMoves((m) => m + 1);

    // Check if solved
    const positions = newTiles.map((t) => t.currentPos);
    if (isSolved(positions, size)) {
      stopGame();
      setIsSolvedState(true);
      const reward = DIFFICULTIES[difficulty].reward;
      toast({
        title: "🏆 Puzzle Solved!",
        description: `Time: ${formatTime(timer)} | Moves: ${moves + 1}. You earned ${reward} points!`,
      });
      setBestTimes((prev) => {
        const prevBest = prev[difficulty];
        if (!prevBest || timer < prevBest) {
          return { ...prev, [difficulty]: timer };
        }
        return prev;
      });
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Preload image
  useEffect(() => {
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.src = IMAGE_SRC;
  }, []);

  const gridTemplate = `repeat(${size}, 1fr)`;
  const [containerWidth, setContainerWidth] = useState(320);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      const w = gridRef.current?.parentElement?.clientWidth ?? Math.min(320, window.innerWidth - 48);
      setContainerWidth(Math.min(320, w - 24));
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const tileSize = containerWidth / size;

  return (
    <CustomerLayout>
      <div className="px-4 py-5 max-w-lg mx-auto space-y-5">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <Puzzle className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">ताज महल जिगसो पज़ल</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Taj Mahal Jigsaw Puzzle — pieces ko sahi jagah arrange karein</p>
        </div>

        {/* Difficulty */}
        <div className="flex gap-2 justify-center">
          {DIFFICULTIES.map((d, i) => {
            const Icon = d.icon;
            return (
              <Button
                key={d.label}
                variant={difficulty === i ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setDifficulty(i);
                  setIsPlaying(false);
                  setIsSolvedState(false);
                  setTiles([]);
                  setSelectedTile(null);
                  setMoves(0);
                  setTimer(0);
                  if (timerRef.current) clearInterval(timerRef.current);
                }}
                className="gap-1"
              >
                <Icon className="h-4 w-4" />
                {d.label}
              </Button>
            );
          })}
        </div>

        {/* Stats */}
        {isPlaying && (
          <div className="flex items-center justify-center gap-4">
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(timer)}
            </Badge>
            <Badge variant="secondary">Moves: {moves}</Badge>
            {bestTimes[difficulty] !== undefined && (
              <Badge variant="outline" className="gap-1">
                <Trophy className="h-3 w-3 text-yellow-500" />
                Best: {formatTime(bestTimes[difficulty])}
              </Badge>
            )}
          </div>
        )}

        {/* Puzzle Grid */}
        <Card className="p-3 mx-auto" style={{ maxWidth: tileSize * size + 24 }}>
          {!imageLoaded ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Puzzle className="h-8 w-8 animate-spin mr-2" />
              Loading image...
            </div>
          ) : !isPlaying && !isSolvedState ? (
            <div className="text-center py-8 space-y-3">
              <div className="flex items-center justify-center">
                <div className="w-40 h-30 rounded-lg overflow-hidden border-2 border-primary/20">
                  <img src={IMAGE_SRC} alt="Taj Mahal" className="w-full h-full object-cover" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {DIFFICULTIES[difficulty].size}×{DIFFICULTIES[difficulty].size} grid
                — {DIFFICULTIES[difficulty].reward} points reward
              </p>
              <Button onClick={startGame} className="gap-1">
                <ChevronRight className="h-4 w-4" />
                Start Puzzle
              </Button>
            </div>
          ) : (
            <div
              className="grid gap-0.5"
              style={{ gridTemplateColumns: gridTemplate, gridTemplateRows: gridTemplate }}
            >
              {tiles.map((tile, index) => {
                const isSelected = selectedTile === index;
                const isCorrect = tile.currentPos === tile.correctPos;
                return (
                  <div
                    key={tile.id}
                    onClick={() => handleTileClick(index)}
                    className={`
                      relative cursor-pointer transition-all duration-200 rounded-sm overflow-hidden
                      ${isSelected ? "ring-2 ring-primary z-10 scale-105" : ""}
                      ${isSolvedState && isCorrect ? "ring-1 ring-green-400" : ""}
                    `}
                    style={{
                      width: tileSize,
                      height: tileSize,
                      backgroundImage: `url(${IMAGE_SRC})`,
                      backgroundPosition: `${tile.bgX} ${tile.bgY}`,
                      backgroundSize: `${size * 100}%`,
                    }}
                  >
                    {/* Number hint (optional) */}
                    {!isSolvedState && (
                      <span className="absolute top-0.5 left-0.5 text-[10px] font-bold text-white/80 bg-black/30 px-1 rounded">
                        {tile.correctPos + 1}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Controls */}
        {isPlaying && !isSolvedState && (
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={startGame} className="gap-1">
              <RotateCcw className="h-4 w-4" />
              Reshuffle
            </Button>
          </div>
        )}

        {/* Success */}
        {isSolvedState && (
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              <span className="font-bold text-lg">Congratulations!</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Completed in {formatTime(timer)} with {moves} moves
            </p>
            <div className="flex justify-center gap-2">
              <Button onClick={startGame} className="gap-1">
                <RotateCcw className="h-4 w-4" />
                Play Again
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const next = (difficulty + 1) % DIFFICULTIES.length;
                  setDifficulty(next);
                  setTimeout(() => startGame(), 100);
                }}
                className="gap-1"
              >
                <ChevronRight className="h-4 w-4" />
                Next Level
              </Button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Kaise khelein:</p>
          <p>1. “Start Puzzle” pe click karein</p>
          <p>2. Ek tile pe click karein, phir doosri tile pe click karein — dono swap ho jayengi</p>
          <p>3. Sab pieces ko sahi jagah pe arrange karein</p>
          <p>4. Image complete hone pe reward points milein!</p>
        </div>
      </div>
    </CustomerLayout>
  );
}
