/** 
 * sokoban
 *
 * todo:
 * - add dijkstra's and mouse movement
 * - add levelset menu selection
 * - add timer
 * - add redo
 * - add "go to next unfinished puzzle" key
 * - right pad arrays for aesthetic reasons or detect edge?
 *
 * http://sokobano.de
 * http://www.sokoban-online.de/
 * https://www.sokobanonline.com/
 * http://www.sourcecode.se/sokoban/
 * http://www.cs.cornell.edu/andru/xsokoban.html
 * http://sokoban-gild.com/
 * https://www.letslogic.com/
 *
 * improving localStorage support: 
 * http://crocodillon.com/blog/always-catch-localstorage-security-and-quota-exceeded-errors
 */

"use strict";


// class to represent a sokoban game with multiple levels
let ReverseSokoban = function(levels, start) {
  this.levels = levels || [["######", "#@$ .#","######"]];
  this.levelNum = start && start < levels.length && start >= 0 ? start : 0;
  this.level;
  this.history;
  this.pushes;
  this.px;
  this.py;
  this.sequence;
  this.bestScore;
  this.storeData;
  
  // initializes a level
  this.init = function(level, storeData) {
    this.history = [];  
    this.level = [];
    this.pushes = 0;
    this.sequence = "";
    this.storeData = storeData === undefined ? true : storeData;
    
    // only successful if player symbol found in level
    let successful = false;
    
    for (let i = 0; i < level.length; i++) {
      this.level.push([]);
      for (let j = 0; j < level[i].length; j++) {
        this.level[i].push(level[i][j]);
        if (level[i][j] === "@" || 
            level[i][j] === "+") {
          this.px = j;
          this.py = i;
          successful = true;
        }
      }
    }
    
    // retrieve previous best score if any
    if (localStorage && this.storeData) {
      let bestScore = localStorage[JSON.stringify(this.levels[this.levelNum])];
      this.bestScore = parseInt(bestScore) || undefined;
    }
    
    // write the first position to history
    this.writeHistory();
    
    return successful;
  }; // end init
 
  // appends current game state to history 
  this.writeHistory = function() {

    // save it as an object
    this.history.push({ 
      level: JSON.stringify(this.level),
      pushes: this.pushes,
      px: this.px,
      py: this.py,
      sequence: this.sequence
    });
  }; // end writeHistory

  // call init in the constructor
  if (!this.init(this.levels[this.levelNum])) {
    console.log("level parsing error"); // todo: throw error instead
  }
  
  // permanently revert to the last state in history
  this.undo = function() {
    
    // abort if not enough history exists
    if (this.history.length <= 1) return false;
    
    // discard current state
    this.history.pop();
    
    // grab the new top of the history stack
    let state = this.history[this.history.length-1];
    this.level = JSON.parse(state.level);
    this.pushes = state.pushes;
    this.px = state.px;
    this.py = state.py;
    this.sequence = state.sequence;
    return true;
  }; // end undo
  
  // permanently revert to the initial state in history
  this.reset = function() {
    this.init(this.levels[this.levelNum]);
  }; // end reset
    
  // stores current position in localStorage 
  // or a var if storage unavailable
  this.savePosition = function() {
    let saveObj = {
      "levelNum": this.levelNum,
      "level": this.level,
      "history": this.history,
      "pushes": this.pushes,
      "px": this.px,
      "py": this.py,
      "sequence": this.sequence,
      "storeData": JSON.stringify(this.storeData)
    };
    if (localStorage) {
      localStorage["sokobansave"] = JSON.stringify(saveObj);
    }
    else { // no localStorage, use an instance var
      this.savedPosition = JSON.stringify(saveObj);
    }
  }; // end savePosition
  
  // retrieve saved position, overwriting current position
  this.loadSavedPosition = function() {
    let saveObj;
    if (localStorage) {
      saveObj = JSON.parse(localStorage["sokobansave"]);
    }
    else if (this.savedPosition) {
      saveObj = JSON.parse(this.savedPosition);
    }
    if (saveObj) {
      this.levelNum = saveObj.levelNum;
      this.level = saveObj.level;
      this.history = saveObj.history;
      this.pushes = saveObj.pushes;
      this.px = saveObj.px;
      this.py = saveObj.py;
      this.sequence = saveObj.sequence;
      this.storeData = JSON.parse(saveObj.storeData);
      return true;
    }
    return false;
  }; // end loadSavedPosition
  
  // allows move input by string.  format example: "udrrudlr"
  this.inputMoveSequence = function(sequence) {
    for (let i = 0; i < sequence.length; i++) {
      if (!this.move(sequence[i])) return false;
    }
    return true;
  }; // end inputSequence
  
  // allows level input by string
  this.inputRawLevel = function(level) {

    // parse level and check validity
    let counter = {
      "@": 0,
      "$": 0,
      ".": 0,
      " ": 0,
      "#": 0,
      "*": 0
    };
    
    level = level.split("\n");
    let parsedLevel = [];
    for (let i = 0; i < level.length; i++) {
      parsedLevel.push(level[i]);
      for (let j = 0; j < parsedLevel[i].length; j++) {
        if (parsedLevel[i][j] === "+") {
          counter["@"]++;
          counter["."]++;
        }
        else if (counter.hasOwnProperty([parsedLevel[i][j]])) {
          counter[parsedLevel[i][j]]++;
        }
        else { // abort if character is unrecognized
          return false; 
        }
      }
    }
    
//    if (counter["@"] === 1 && counter["$"] &&
//        counter["$"] === counter["."]) {
      return this.init(level, false);
//    }    
    return false;
  }; // end inputRawLevel
  
  // switch levels if valid
  this.switchLevel = function(level) {
    if (level >= 0 && level < this.levels.length) {
      this.levelNum = level;
      this.init(this.levels[level]);
      return true;
    }
    return false;
  }; // end switchLevel
  
  // move player
  this.move = function(dir, shouldPull) {
    dir = dir.toLowerCase();
    
    // validate input 
    if (["u", "d", "l", "r"].indexOf(dir) < 0) {
      return false; // abort move
    }
        
    // move player in specified direction if possible or abort
    switch (dir) {
      case "u": if (!this.moveHandler(0, -1, shouldPull)) return false; break;
      case "d": if (!this.moveHandler(0, 1, shouldPull))  return false; break;
      case "l": if (!this.moveHandler(-1, 0, shouldPull)) return false; break;
      case "r": if (!this.moveHandler(1, 0, shouldPull))  return false; break;
    }

    // write move to sequence string and append this board position to the history
    this.sequence += dir;
    this.writeHistory();
    
    // load next level if finished
    if (this.isFinished()) {
        
      // update localStorage if this is a new best score
      if (localStorage && this.storeData && (isNaN(this.bestScore) || 
          this.history.length < this.bestScore)) {
        localStorage[JSON.stringify(this.levels[this.levelNum])] = this.history.length-1;
      }

      // proceed to the next level
      this.levelNum = ++this.levelNum % this.levels.length;
      this.init(this.levels[this.levelNum]);
    }
    
    // this was a successful move
    return true;
  }; // end move
  
  // helper function for handling movement
  this.moveHandler = function(dx, dy, shouldPull) {

    if (shouldPull) {
      // check if player is trying to pull a box
      if (this.level[this.py-dy][this.px-dx] === "$" ||
          this.level[this.py-dy][this.px-dx] === "*") {
        
        // determine if the box is vacating a goal space or not
        let oldBoxSpace = this.level[this.py-dy][this.px-dx] === "*" ? "." : " ";
        
        // determine if player is vacating a goal space or not
        let oldPlayerSpace = this.level[this.py][this.px] === "@" ? "$" : "*";
        
        // if valid, move box onto player space and move player onto empty space
        if (this.level[this.py+dy][this.px+dx] === " " ||
            this.level[this.py+dy][this.px+dx] === ".") {
          this.level[this.py][this.px] = oldPlayerSpace;
          this.level[this.py-dy][this.px-dx] = oldBoxSpace;
          
          // increment number of pushes
          this.pushes++;
        }
        else { // box is immovable
          return false;
        }
      }    
    }

    // determine if player is vacating a goal space or not or if a box was just moved there
    let oldSpace = this.level[this.py][this.px];
    if (oldSpace !== "$" && oldSpace !== "*") {
      oldSpace = oldSpace === "@" ? " " : ".";
    }
    let newSpace = this.level[this.py+dy][this.px+dx] === "." ? "+" : "@";

    // move player to an empty space
    if (this.level[this.py+dy][this.px+dx] === " " ||
        this.level[this.py+dy][this.px+dx] === ".") {
      this.level[this.py][this.px] = oldSpace;
      this.px += dx;
      this.py += dy;
      this.level[this.py][this.px] = newSpace;
    }
    else { // invalid move
      return false;
    }
    
    // this was a successful move
    return true;
  }; // end moveHandler
  
  // check if the current level has been completed
  this.isFinished = function() {
    for (let i = 0; i < this.level.length; i++) {
      for (let j = 0; j < this.level[i].length; j++) {
        if (this.level[i][j] === "$" || this.level[i][j] === ".") {
//          return false;
        }
      }
    }
//    return true;
  }; // end isFinished
  
  // renders the current position to HTML
  this.toHTML = function() {
    let output = "<table>";
    for (let i = 0; i < this.level.length; i++) {
      output += "<tr>";
      for (let j = 0; j < this.level[i].length; j++) {
        output += "<td class='";
        switch (this.level[i][j]) {
          case " ": output += "sokospace";   break;
          case "#": output += "sokowall";    break;
          case ".": output += "sokogoal";    break;
          case "$": output += "sokobox";     break;
          case "*": output += "sokoboxg";    break;
          case "@": output += "sokoplayer";  break;
          case "+": output += "sokoplayerg"; break;
          default : console.log("toHTML char error");
        }
        output += "'></td>";
      }
      output += "</tr>";
    }
    return output + "</table>";
  }; // end toHTML
}; // end Sokoban