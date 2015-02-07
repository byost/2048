function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size; // Size of the grid
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;

  this.startTiles     = 2;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

  this.setup();
}

// Restart the game
GameManager.prototype.restart = function () {
  this.storageManager.clearGameState();
  this.actuator.continueGame(); // Clear the game won/lost message
  this.setup();
};

// Keep playing after winning (allows going over 2048)
GameManager.prototype.keepPlaying = function () {
  this.keepPlaying = true;
  this.actuator.continueGame(); // Clear the game won/lost message
};

// Return true if the game is lost, or has won and the user hasn't kept playing
GameManager.prototype.isGameTerminated = function () {
  return this.over || (this.won && !this.keepPlaying);
};

// Set up the game
GameManager.prototype.setup = function () {
  var previousState = this.storageManager.getGameState();

  // Reload the game from a previous game if present
  if (previousState) {
    this.grid        = new Grid(previousState.grid.size,
                                previousState.grid.cells); // Reload grid
    this.score       = previousState.score;
    this.over        = previousState.over;
    this.won         = previousState.won;
    this.keepPlaying = previousState.keepPlaying;
  } else {
    this.grid        = new Grid(this.size);
    this.score       = 0;
    this.over        = false;
    this.won         = false;
    this.keepPlaying = false;

    // Add the initial tiles
    this.addStartTiles();
  }

  // Update the actuator
  this.actuate();
};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
  }
};

// Adds a tile in a random position
GameManager.prototype.addRandomTile = function () {
  if (this.grid.cellsAvailable()) {
    var value = Math.random() < 0.9 ? 2 : 4;
    var tile = new Tile(this.grid.randomAvailableCell(), value);

    this.grid.insertTile(tile);
  }
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  if (this.storageManager.getBestScore() < this.score) {
    this.storageManager.setBestScore(this.score);
  }

  // Clear the state when the game is over (game over only, not win)
  if (this.over) {
    this.storageManager.clearGameState();
  } else {
    this.storageManager.setGameState(this.serialize());
  }

  this.actuator.actuate(this.grid, {
    score:      this.score,
    over:       this.over,
    won:        this.won,
    bestScore:  this.storageManager.getBestScore(),
    terminated: this.isGameTerminated()
  });

};

// Represent the current game as an object
GameManager.prototype.serialize = function () {
  return {
    grid:        this.grid.serialize(),
    score:       this.score,
    over:        this.over,
    won:         this.won,
    keepPlaying: this.keepPlaying
  };
};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
  this.grid.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2: down, 3: left
  var moved = this.processRows(direction) ;

  /*
  var self = this;

  if (this.isGameTerminated()) return; // Don't do anything if the game's over

  var cell, tile;
  var traversals = this.buildTraversals(vector);

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector);
        var next      = self.grid.cellContent(positions.next);

        // Only one merger per row traversal?
        if (next && next.value === tile.value && !next.mergedFrom) {
          var merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];

          self.grid.insertTile(merged);
          self.grid.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);

          // Update the score
          self.score += merged.value;

          // The mighty 2048 tile
          if (merged.value === 2048) self.won = true;
        } else {
          self.moveTile(tile, positions.farthest);
        }

        if (!self.positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!
        }
      }
    });
  });
  if (direction%2 == 1) { this.grid.horzbackShift(); } else { this.grid.vertbackShift(); }
 */
  if (moved) {
    this.addRandomTile();

    if (!this.movesAvailable()) {
      this.over = true; // Game over!
    } 
    this.actuate();
  }
};

GameManager.prototype.process = function (a) {
    if (a.length<2) {
        return a;
    } else {
      if (a[0]) {
        if (a[1]) {
          if (a[0].value==a[1].value) {     //merge tiles if true
            a.shift();
            a[0].value = 2*a[0].value;
            this.score += a[0].value;             
            }
        } else {
            a.splice(1,1);
            return this.process(a);
        }
        return [a.shift()].concat(this.process(a));
    } else return this.process(a.slice(1));
  }
};
GameManager.prototype.processRows = function (direction) {
  // create rows and send to process(row)
  var moved = false;  

  if (direction == 0) {   //up
    for (i=0;i<2;i++) {
      var row1 = [], row2 = [];
      for (j=0;j<4;j++) {
        row1.push(this.grid.cells[i][(j+3)%4]);
        row2.push(this.grid.cells[i+2][(j+1)%4]);
      }
      row1 = this.process(row1);
      row2 = this.process(row2);
        for (j=0;j<4;j++) {
          if (row1[j] != this.grid.cells[i][(j+3)%4]) {
            moved = true;
            if (row1[j]) {
              row1[j].updatePosition({x:i,y:(j+3)%4});
              this.grid.cells[i][(j+3)%4] = row1[j];
          } else {
            this.grid.cells[i][(j+3)%4] = null;
          }
        }
          if (row2[j] != this.grid.cells[i+2][(j+1)%4]) {
            moved = true;
            if (row2[j]) {
              row2[j].updatePosition({x:i+2,y:(j+1)%4});
              this.grid.cells[i+2][(j+1)%4] = row2[j];
          } else {
            this.grid.cells[i+2][(j+1)%4] = null;
          }
        }
      }
    }
  }
  if (direction == 1) {       // right
    for (j=0;j<2;j++) {
      var row1 = [], row2 = [];
      for (i=0;i<4;i++) {
        row1.push(this.grid.cells[(4-i)%4][j]);
        row2.push(this.grid.cells[(6-i)%4][j+2]);
      }
      row1 = this.process(row1);
      row2 = this.process(row2);
        for (i=0;i<4;i++) {
          if (row1[i] != this.grid.cells[(4-i)%4][j]) {
            moved = true;
            if (row1[i]) {
              row1[i].updatePosition({x:(4-i)%4,y:j});
              this.grid.cells[(4-i)%4][j] = row1[i];
          } else {
            this.grid.cells[(4-i)%4][j] = null;
          }
        }
          if (row2[i] != this.grid.cells[(6-i)%4][j+2]) {
            moved = true;
            if (row2[i]) {
              row2[i].updatePosition({x:(6-i)%4,y:j+2});
              this.grid.cells[(6-i)%4][j+2] = row2[i];
          } else {
            this.grid.cells[(6-i)%4][j+2] = null;
          }
        }
      }
    }
  }
  if (direction == 3) {       // left
    for (j=0;j<2;j++) {
      var row1 = [], row2 = [];
      for (i=0;i<4;i++) {
        row1.push(this.grid.cells[(i+1)%4][j]);
        row2.push(this.grid.cells[(i+3)%4][j+2]);
      }
      row1 = this.process(row1);
      row2 = this.process(row2);
        for (i=0;i<4;i++) {
          if (row1[i] != this.grid.cells[(i+1)%4][j]) {
            moved = true;
            if (row1[i]) {
              row1[i].updatePosition({x:(i+1)%4,y:j});
              this.grid.cells[(i+1)%4][j] = row1[i];
          } else {
            this.grid.cells[(i+1)%4][j] = null;
          }
        }
          if (row2[i] != this.grid.cells[(i+3)%4][j+2]) {
            moved = true;
            if (row2[i]) {
              row2[i].updatePosition({x:(i+3)%4,y:j+2});
              this.grid.cells[(i+3)%4][j+2] = row2[i];
          } else {
            this.grid.cells[(i+3)%4][j+2] = null;
          }
        }
      }
    }
  }
  if (direction == 2) {     //down
    for (i=0;i<2;i++) {
      var row1 = [], row2 = [];
      for (j=0;j<4;j++) {
        row1.push(this.grid.cells[i][(6-j)%4]);
        row2.push(this.grid.cells[i+2][(4-j)%4]);
      }
      row1 = this.process(row1);
      row2 = this.process(row2);
      for (j=0;j<4;j++) {
        if (row1[j] != this.grid.cells[i][(6-j)%4]) {
            moved = true;
            if (row1[j]) {
              row1[j].updatePosition({x:i,y:(6-j)%4});
              this.grid.cells[i][(6-j)%4] = row1[j];
          } else {
            this.grid.cells[i][(6-j)%4] = null;
          }
        }
          if (row2[j] != this.grid.cells[i+2][(4-j)%4]) {
            moved = true;
            if (row2[j]) {
              row2[j].updatePosition({x:i+2,y:(4-j)%4});
              this.grid.cells[i+2][(4-j)%4] = row2[j];
          } else {
            this.grid.cells[i+2][(4-j)%4] = null;
          }
        }
      }
    }
  }
  return moved;
};

/* Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.grid.withinBounds(cell) &&
           this.grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
}; */

GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
  self = this.grid.cells;
  var moves = false;
  [{i:3,j:0},{i:0,j:1},{i:1,j:2}].forEach(function(offset) {
   
    if (self[0][offset.i].value == self[0][offset.j].value ||
        self[offset.i][2].value == self[offset.j][2].value ||
        self[1][offset.i].value == self[1][offset.j].value ||
        self[offset.i][3].value == self[offset.j][3].value )
    moves = true; 
  });

  [{i:1,j:2},{i:2,j:3},{i:3,j:0}].forEach(function(offset) {
    if (self[2][offset.i].value == self[2][offset.j].value ||
        self[offset.i][0].value == self[offset.j][0].value ||
        self[3][offset.i].value == self[3][offset.j].value ||
        self[offset.i][1].value == self[offset.j][1].value)
    moves = true;
  });
  
  return moves;
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};
