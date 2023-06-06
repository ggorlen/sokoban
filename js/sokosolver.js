/**
 * homebrew sokoban solver
 *
 * in progress...
 * - speed up goto by allowing its BFS validation to be overridden when called from sokosolver
 * 
 * resources:
 * - http://sokobano.de/wiki/index.php?title=Solver
 */

 
// solves a sokoban level if possible
const solve = function (game) {

  // set of visited positions
  const visited = {};
  visited[JSON.stringify(game.level)] = true;
  
  // queue for BFS with current position as starting point
  const queue = [game];

  // iterate while there are positions to inspect
  while (queue.length) {
  
    // dequeue a position
    game = queue.shift();
    
    // set this position as visited
    visited[JSON.stringify(game.level)] = true;

    console.table(game.level);
    
    // return true if this position is solved
    if (game.isFinished()) { 
      return true; 
    }
    
    // get list of possible pushes for this position
    possiblePushes = getPossiblePushes(game);
    
    console.log("possible pushes: ");
    console.log(possiblePushes);
    
    // execute each possible push on a copy of the level
    for (let key in possiblePushes) {

      // parse the square coordinates
      key = JSON.parse(key);
        
      // get the string of moves for this position
      const moves = possiblePushes[key];
      
      for (let i = 0; i < moves.length; i++) {
          
        // make a copy of the position
        //let gameCopy = this.level.map((a) => a.slice());
        const gameCopy = $.extend(true, {}, game);
        
        // execute move
        if (moves[i] === "u") {
          gameCopy.goTo(key[0], key[1]+1);
          gameCopy.move("u", false);
        }
        else if (moves[i] === "d") {
          gameCopy.goTo(key[0], key[1]-1);
          gameCopy.move("d", false);
        }
        else if (moves[i] === "l") {
          gameCopy.goTo(key[0]+1, key[1]);
          gameCopy.move("l", false);
        }
        else if (moves[i] === "r") {
          gameCopy.goTo(key[0]-1, key[1]);
          gameCopy.move("r", false);
        }

        // enqueue the new position if unvisited
        if (!visited[JSON.stringify(gameCopy.level)]) {
          queue.push(gameCopy);
        }
      }
    }
  } // end while
  
  // unsolvable
  return false;
}; // end solve

// return a hash of possible pushes in a given position in a game
// key: x, y location of pushable box.  value: string of possible pushes as udlr
const getPossiblePushes = function (game) {
  
  // extract position from game object
  const position = game.level;
  
  // array to store x, y locations of possible pushes for this position
  // along with the direction(s) of the push(es) in udlr format
  const pushLocations = {};
  console.log(pushLocations);
  
  // queue to hold squares pending inspection
  const queue = [];
  
  // hash of visited squares and their parents
  const visited = {};
  
  // enqueue origin, set it as visited and set its parent to null
  queue.push([game.px, game.py]);
  visited[game.px + " " + game.py] = null;
  
  // while there are still nodes left to visit...
  while (queue.length) {
      
    // dequeue an item
    const current = queue.shift();
  
    // is this a pushable box?  if so, add it to the pushLocations list
    // don't enqueue it either way
    if (["$", "*"].indexOf(position[current[1]][current[0]]) >= 0) {
      
      // get the parent of the box to determine which direction we're trying to push from
      const parent = visited[current[0] + " " + current[1]];

      // create the key for the current position
      const pushKey = JSON.stringify([current[0], current[1]]);
      
      // try pushing left
      if (parent[0] > current[0] &&
          [".", " "].indexOf(position[current[1]][current[0]-1]) >= 0) {
        if (pushLocations[pushKey]) {
          pushLocations[pushKey] += "l";
        }
        else {
          pushLocations[pushKey] = "l";
        }
      }
      // try pushing right
      else if (parent[0] < current[0] && 
          [".", " "].indexOf(position[current[1]][current[0]+1]) >= 0) {
        if (pushLocations[pushKey]) {
          pushLocations[pushKey] += "r";
        }
        else {
          pushLocations[pushKey] = "r";
        }
      }
      // try pushing down
      else if (parent[1] < current[1] && 
          [".", " "].indexOf(position[current[1]+1][current[0]]) >= 0) {
        if (pushLocations[pushKey]) {
          pushLocations[pushKey] += "d";
        }
        else {
          pushLocations[pushKey] = "d";
        }
      }                                 
      // try pushing up
      else if (parent[1] > current[1] &&
          [".", " "].indexOf(position[current[1]-1][current[0]]) >= 0) {
        if (pushLocations[pushKey]) {
          pushLocations[pushKey] += "u";
        }
        else {
          pushLocations[pushKey] = "u";
        }
      }
    }
    else {  // not evaluating a box, grab a list of available adjacent squares
      const adjacent = game.getNeighbors(current[0], current[1], [" ", "*", "$", "."]);
      
      // for each unvisited adjacent square or box square, enqueue and set parent
      for (let i = 0; i < adjacent.length; i++) {
        
        // enqueue unvisited squares and box squares already in pushLocations
        // which may have another way to push which needs to be considered
        if (!visited[adjacent[i][0] + " " + adjacent[i][1]] || 
            pushLocations[JSON.stringify(adjacent[i])]) {
          queue.push(adjacent[i]);
        }
        
        // mark this square visited and set its parent to current
        visited[adjacent[i][0] + " " + adjacent[i][1]] = current;
      }
    }
  }
  
  // return the list of possible push locations
  return pushLocations;
}; // end getPossiblePushes
