function Grid(size, previousState) {
  this.size = size;
  this.cells = previousState ? this.fromState(previousState) : this.empty();
}

// Build a grid of the specified size
Grid.prototype.empty = function () {
  var cells = [];

  for (var x = 0; x < this.size; x++) {
    var row = cells[x] = [];

    for (var y = 0; y < this.size; y++) {
      row.push(null);
    }
  }

  return cells;
};

//debug grid in console
Grid.prototype.printGrid = function (a) {
  for (var x = 0; x < this.size; x++) {
      console.log(a.cells[0][x]? a.cells[0][x].value : null,a.cells[1][x]? a.cells[1][x].value : null,
                  a.cells[2][x]? a.cells[2][x].value : null,a.cells[3][x]? a.cells[3][x].value : null);  
  }   
};

Grid.prototype.fromState = function (state) {
  var cells = [];

  for (var x = 0; x < this.size; x++) {
    var row = cells[x] = [];

    for (var y = 0; y < this.size; y++) {
      var tile = state[x][y];
      row.push(tile ? new Tile(tile.position, tile.value) : null);
    }
  }

  return cells;
};

// Find the first available random position
Grid.prototype.randomAvailableCell = function () {
  var cells = this.availableCells();

  if (cells.length) {
    return cells[Math.floor(Math.random() * cells.length)];
  }
};

Grid.prototype.availableCells = function () {
  var cells = [];

  this.eachCell(function (x, y, tile) {
    if (!tile) {
      cells.push({ x: x, y: y });
    }
  });

  return cells;
};

// Call callback for every cell
Grid.prototype.eachCell = function (callback) {
  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      callback(x, y, this.cells[x][y]);
    }
  }
};

// Check if there are any cells available
Grid.prototype.cellsAvailable = function () {
  return !!this.availableCells().length;
};

// Check if the specified cell is taken
Grid.prototype.cellAvailable = function (cell) {
  return !this.cellOccupied(cell);
};

Grid.prototype.cellOccupied = function (cell) {
  return !!this.cellContent(cell);
};

Grid.prototype.cellContent = function (cell) {
  if (this.withinBounds(cell)) {
    return this.cells[cell.x][cell.y];
  } else {
    return null;
  }
};

// Inserts a tile at its position
Grid.prototype.insertTile = function (tile) {
  this.cells[tile.x][tile.y] = tile;
};

Grid.prototype.removeTile = function (tile) {
  this.cells[tile.x][tile.y] = null;
};

Grid.prototype.withinBounds = function (position) {
  return position.x >= 0 && position.x < this.size &&
         position.y >= 0 && position.y < this.size;
};

Grid.prototype.serialize = function () {
  var cellState = [];

  for (var x = 0; x < this.size; x++) {
    var row = cellState[x] = [];

    for (var y = 0; y < this.size; y++) {
      row.push(this.cells[x][y] ? this.cells[x][y].serialize() : null);
    }
  }

  return {
    size: this.size,
    cells: cellState
  };
};
// transform grid torus -> flat
Grid.prototype.horzShift = function () {
  var tempcells = [[null,null,null,null],[null,null,null,null],[null,null,null,null],[null,null,null,null]];
  for (var i =0; i<4;i++) {
    for (var j=0; j<4; j++) {
      tempcells[i][j] = this.cells[i][j];
     }
  }
  // first remove tiles
  for (var i = 0; i < 4; i++) { 
    for (var j = 0; j < 2; j++) {
      if (tempcells[(i+1)%4][j]) {
        this.removeTile({x:((i+1)%4),y:j});
      }
      if (tempcells[(i+3)%4][j+2]) {
        this.removeTile({x:((i+3)%4),y:j+2});
      }
    }
  }
// then insert new tiles
  for (var i = 0; i < 4; i++) { 
    for (var j = 0; j < 2; j++) {
      if (tempcells[(i+1)%4][j]) {
        var tile = new Tile({x:i,y:j}, tempcells[(i+1)%4][j].value);
      
        tile.mergedFrom = tempcells[(i+1)%4][j].mergedFrom;
        tile.previousPosition = tempcells[(i+1)%4][j].previousPosition;
        if (tile.mergedFrom) {
          tile.mergedFrom.forEach(function (merged) {
             merged.x = (merged.x +3)%4;
          });
        }
        this.insertTile(tile);
     }
      if (tempcells[(i+3)%4][j+2]) {
        var tile = new Tile({x:i,y:j+2}, tempcells[(i+3)%4][j+2].value);
        tile.mergedFrom = tempcells[(i+3)%4][j+2].mergedFrom;
        tile.previousPosition = tempcells[(i+3)%4][j+2].previousPosition;
        if (tile.mergedFrom) {
          tile.mergedFrom.forEach(function (merged) {
             merged.x = (merged.x +1)%4;
          });
        }
        this.insertTile(tile);
      }
    }
  } 
};     

// transform grid flat -> torus
Grid.prototype.horzbackShift = function () {
  var tempcells = [[null,null,null,null],[null,null,null,null],[null,null,null,null],[null,null,null,null]];
  for (var i =0; i<4;i++) {
    for (var j=0; j<4; j++) {
      tempcells[i][j] = this.cells[i][j];
     }
  }
  // first remove tiles
  for (var i = 0; i < 4; i++) { 
    for (var j = 0; j < 2; j++) {
      if (tempcells[(i+3)%4][j]) {
        this.removeTile({x:(i+3)%4,y:j});
      }
      if (tempcells[(i+1)%4][j+2]) {
        this.removeTile({x:((i+1)%4),y:j+2});
      }
    }
  }
  // then insert new tiles
  for (var i = 0; i< 4; i++) { 
    for (var j = 0; j < 2; j++) {
      if (tempcells[(i+3)%4][j]) {
        var tile = new Tile({x:i,y:j}, tempcells[(i+3)%4][j].value);
        tile.mergedFrom = tempcells[(i+3)%4][j].mergedFrom;
        tile.previousPosition = tempcells[(i+3)%4][j].previousPosition;
        if (tile.previousPosition) 
          {tile.previousPosition.x = (tile.previousPosition.x + 1) % 4;
            if (tile.previousPosition.x == 0) {tile.previousPosition.x = 3;}}
        if (tile.mergedFrom) {
          tile.mergedFrom.forEach(function (merged) {
             merged.x = (merged.x +1)%4;
          });
        }
        this.insertTile(tile);
      }
      if (tempcells[(i+1)%4][j+2]) {
        var tile = new Tile({x:i,y:j+2}, tempcells[(i+1)%4][j+2].value);
        tile.mergedFrom = tempcells[(i+1)%4][j+2].mergedFrom;
        tile.previousPosition = tempcells[(i+1)%4][j+2].previousPosition;
        if (tile.previousPosition) {tile.previousPosition.x = (tile.previousPosition.x + 3) % 4;}
        if (tile.mergedFrom) {
          tile.mergedFrom.forEach(function (merged) {
             merged.x = (merged.x +3)%4;
          });
        }
        this.insertTile(tile);
      }
    }
  } 
};  

// transform grid torus -> flat
Grid.prototype.vertShift = function () {
  var tempcells = [[null,null,null,null],[null,null,null,null],[null,null,null,null],[null,null,null,null]];
  for (var i =0; i<4;i++) {
   for (var j=0; j<4; j++) {
      tempcells[i][j] = this.cells[i][j];
     }
  }
  // first remove tiles
  for (var j = 0; j < 4; j++) { 
    for (var i = 0; i < 2; i++) {
      if (tempcells[i][(j+3)%4]) {
        this.removeTile({x:i,y:(j+3)%4});
      }
      if (tempcells[i+2][(j+1)%4]) {
        this.removeTile({x:i+2,y:(j+1)%4});
      }
    }
  }
// then insert new tiles
 for (var j = 0; j < 4; j++) { 
    for (var i = 0; i < 2; i++) {
      if (tempcells[i][(j+3)%4]) {
        var tile = new Tile({x:i,y:j}, tempcells[i][(j+3)%4].value);
      
        tile.mergedFrom = tempcells[i][(j+3)%4].mergedFrom;
        tile.previousPosition = tempcells[i][(j+3)%4].previousPosition;
        if (tile.mergedFrom) {
          tile.mergedFrom.forEach(function (merged) {
             merged.y = (merged.y+1)%4;
          });
        }
        this.insertTile(tile);
     }
      if (tempcells[i+2][(j+1)%4]) {
        var tile = new Tile({x:i+2,y:j}, tempcells[i+2][(j+1)%4].value);
        tile.mergedFrom = tempcells[i+2][(j+1)%4].mergedFrom;
        tile.previousPosition = tempcells[i+2][(j+1)%4].previousPosition;
        if (tile.mergedFrom) {
          tile.mergedFrom.forEach(function (merged) {
             merged.y = (merged.y+3)%4;
          });
        }
        this.insertTile(tile);
      }
    }
  } 
};     

// transform grid flat -> torus
Grid.prototype.vertbackShift = function () {
  var tempcells = [[null,null,null,null],[null,null,null,null],[null,null,null,null],[null,null,null,null]];
  for (var i =0; i<4;i++) {
    for (var j=0; j<4; j++) {
      tempcells[i][j] = this.cells[i][j];
     }
  }
  // first remove tiles
   for (var j = 0; j < 4; j++) { 
    for (var i = 0; i < 2; i++) {
      if (tempcells[i][(j+1)%4]) {
        this.removeTile({x:i,y:(j+1)%4});
      }
      if (tempcells[i+2][(j+3)%4]) {
        this.removeTile({x:i+2,y:(j+3)%4});
      }
    }
  }
  // then insert new tiles
  for (var j = 0; j < 4; j++) { 
    for (var i = 0; i < 2; i++) {
      if (tempcells[i][(j+1)%4]) {
        var tile = new Tile({x:i,y:j}, tempcells[i][(j+1)%4].value);
      
        tile.mergedFrom = tempcells[i][(j+1)%4].mergedFrom;
        tile.previousPosition = tempcells[i][(j+1)%4].previousPosition;
        if (tile.previousPosition) {tile.previousPosition.y = (tile.previousPosition.y + 3) % 4;}
        if (tile.mergedFrom) {
          tile.mergedFrom.forEach(function (merged) {
             merged.y = (merged.y+3)%4;
          });
        }
        this.insertTile(tile);
     }
      if (tempcells[i+2][(j+3)%4]) {
        var tile = new Tile({x:i+2,y:j}, tempcells[i+2][(j+3)%4].value);
        tile.mergedFrom = tempcells[i+2][(j+3)%4].mergedFrom;
        tile.previousPosition = tempcells[i+2][(j+3)%4].previousPosition;
        if (tile.previousPosition) {tile.previousPosition.y = (tile.previousPosition.y + 1) % 4;}
        if (tile.mergedFrom) {
          tile.mergedFrom.forEach(function (merged) {
             merged.y = (merged.y+1)%4;
          });
        }
        this.insertTile(tile);
      }
    }
  } 
};  