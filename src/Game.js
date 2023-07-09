import React, { useState, useEffect } from 'react';
import data from './data.json';
import { Helmet } from 'react-helmet'; // Add this import
import seedrandom from 'seedrandom';

function Game() {
    const [gameData, setGameData] = useState([]);
    const [difficulty, setDifficulty] = useState('Medium');
    const [unplayedGames, setUnplayedGames] = useState([]);
  const [currentGame, setCurrentGame] = useState(null);
  const [currentGuess, setCurrentGuess] = useState([]);
  const [foundGroups, setFoundGroups] = useState({});
  const [attempts, setAttempts] = useState(4);
  const [message, setMessage] = useState('');
  const [animation, setAnimation] = useState(null);
  const [animationWords, setAnimationWords] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameId, setGameId] = useState(null); // Add this line
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [selectionStreak, setSelectionStreak] = useState([]);

  const levelColors = ['#fbd400', '#b5e352', '#729eeb', '#bc70c4'];
  const levelEmojis = ["🔵", "🟢", "🟡", "🔴", "🟣"]; // Choose your own emojis


  useEffect(() => {
    setTimeElapsed(0);  // Reset the timer when starting a new game
  
    // Other codes
  
    const timer = setInterval(() => {
      setTimeElapsed(timeElapsed => timeElapsed + 1);
    }, 1000);
  
    return () => clearInterval(timer);
  }, [gameId]);  // Only depend on gameId

  function mixGroups(gameId, difficulty) {
    const rng = seedrandom(gameId); // Create seeded random number generator
    let newGame = { groups: {}, startingGroups: [[], [], [], []] };
    let usedWords = new Set();
  
    // Define difficulty levels
    let levels = [];
    switch(difficulty){
      case "Easy":
        levels = [0, 1];
        break;
      case "Hard":
        levels = [2, 3];
        break;
      default: // Medium
        levels = [0, 1, 2, 3];
        break;
    }
    
    for(let i=0; i<4; i++) {
      let randomId, randomGame, groupKey;
  
      // Keep trying until a suitable group is found
      do {
        do {
          randomId = Math.floor(rng() * data.length);
        } while(randomId === gameId); // Ensure that we don't select the same game
  
        randomGame = data[randomId];
  
        do {
          groupKey = Object.keys(randomGame.groups)[Math.floor(rng() * Object.keys(randomGame.groups).length)];
        } while(!levels.includes(randomGame.groups[groupKey].level)); // Check if the group's level is included in the selected levels
  
      } while(randomGame.groups[groupKey].members.some(member => usedWords.has(member))); // Check if the members are already used
  
      newGame.groups = {...newGame.groups, [groupKey]: randomGame.groups[groupKey]};
          
      // Shuffle members into startingGroups
      randomGame.groups[groupKey].members.forEach((member, index) => {
        usedWords.add(member); // Add the member to the usedWords set
  
        let insertionRow;
        do {
          insertionRow = Math.floor(rng() * 4);
        } while (newGame.startingGroups[insertionRow].length === 4);
        newGame.startingGroups[insertionRow].push(member);
      });
    }
    
    return newGame;
  }
  
  const shuffleArray = (array) => {
    let currentIndex = array.length, temporaryValue, randomIndex;
    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
    return array;
  };
  
  

  useEffect(() => {
    setGameData(data);
    setTimeElapsed(0);
    setUnplayedGames([...Array(data.length).keys()]);
    let gameIndex;

    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('gameId');
    setGameId(gameId);

    const difficulty = urlParams.get('difficulty') || 'Medium'; // default to Medium
    setDifficulty(difficulty);

    if(gameId){
        gameIndex = gameId;
        const mixedGame = mixGroups(gameIndex, difficulty);
        setCurrentGame(mixedGame);
    } else {
        gameIndex = generateIndexConnections() % data.length;
        setCurrentGame(data[gameIndex]);
    }

    setUnplayedGames(prevUnplayedGames => prevUnplayedGames.filter(index => index !== gameIndex));
    // Reset the timer and selection streak when a new game is started
    setSelectionStreak([]);
  }, [gameId]);

  const changeDifficulty = (newDifficulty) => {
    // Generate new random index
    const randomIndex = Math.floor(Math.random() * unplayedGames.length);
    const nextGameIndex = unplayedGames[randomIndex];

    // Update the URL to include new gameId and difficulty
    window.location.href = window.location.origin + '?gameId=' + nextGameIndex + '&difficulty=' + newDifficulty;
  }

  function generateIndexConnections() {
    const D = 864e5;
    const e = new Date("6/12/2023");
    const t = (new Date()).setHours(0, 0, 0, 0) - e.setHours(0, 0, 0, 0);
    let n = Math.round(t / D);
    return n < 0 ? Math.abs(n) : n;
  }

  const handleWordClick = word => {
    // If the word is already selected, remove it from the currentGuess
    if (currentGuess.includes(word)) {
      setCurrentGuess(currentGuess.filter(guess => guess !== word));
    } 
    // Else if there are less than 4 items in the currentGuess, add the word
    else if (currentGuess.length < 4) {
      setCurrentGuess([...currentGuess, word]);
    } 
    // If there are 4 items already and the word isn't one of them, ignore the click
    else {
      return;
    }
  };

  
  

  const submitGuess = () => {
    if (currentGuess.length !== 4) {
        setMessage('You need to select 4 items before submitting');
        return;
      }
      console.log(currentGame)
      const guessedGroup = Object.entries(currentGame.groups).find(
        ([groupName, group]) =>
          JSON.stringify(group.members.sort()) === JSON.stringify(currentGuess.sort())
      );

    if (guessedGroup) {
      setFoundGroups({
        ...foundGroups,
        [guessedGroup[0]]: guessedGroup[1].members,
      });

      const newStartingGroups = currentGame.startingGroups
        .flat()
        .filter(word => !currentGuess.includes(word));

      setCurrentGame({
        ...currentGame,
        startingGroups: chunkArray(newStartingGroups, 4),
      });
      
      setMessage('Congratulations! You have found a group!');
        setAnimation('success');
        setAnimationWords(currentGuess);
        setTimeout(() => {
            setCurrentGuess([]);
            setAnimation(null);
            setAnimationWords([]);
        }, 1000);
    } else {
        setAnimation('error');
        setAnimationWords(currentGuess);
        setTimeout(() => {
            setAnimation(null);
            setAnimationWords([]);
        }, 1000);
      setMessage('Incorrect guess, please try again');
        setAttempts(prevAttempts => {
            if(prevAttempts - 1 === 0) {
                setGameOver(true);
                setMessage('Game Over! All attempts used up!');
            }
            return prevAttempts - 1;
        });
    }

    const wordLevels = currentGuess.map((word) => {
      // Find the group to which the word belongs
      const groupName = Object.keys(currentGame.groups).find(
        key => currentGame.groups[key].members.includes(word)
      );
    
      // Get the level of this group
      const level = currentGame.groups[groupName].level;
    
      // Return the word and its corresponding level
      return { word, level };
    });
  
    setSelectionStreak([...selectionStreak, wordLevels]);
  };

  const startNewGame = () => {
    if (unplayedGames.length === 0) {
      setMessage('No more games left!');
      return;
    }

    const randomIndex = Math.floor(Math.random() * unplayedGames.length);
    const nextGameIndex = unplayedGames[randomIndex];
    setUnplayedGames(prevUnplayedGames => prevUnplayedGames.filter(index => index !== nextGameIndex));

    // Redirect to new page with gameId as URL parameter
    window.location.href = window.location.origin + '?gameId=' + nextGameIndex;
  };

  const restartGame = () => {
    window.location.reload();
  };

  const resetGuess = () => {
    setCurrentGuess([]);
  };

  const copyResultsToClipboard = () => {
    // Create a string from the selection streak
    const resultsString = selectionStreak.map((guess, index) => 
      guess.map((wordObj) => `${levelEmojis[wordObj.level]}`).join('')
    ).join('');
    window.focus();
    // Copy the string to the clipboard
    navigator.clipboard.writeText('ConnectionsUnlimited.org - ' + resultsString).then(function(){
      alert('Copied to Clipboard, you can now share the result in social media.');
    });
    // Show an alert message
  };
  
  

  return (
    <>
    <div className="game-container">
      {gameId && (
        <Helmet>
          <meta name="robots" content="noindex" />
        </Helmet>
      )}
      
      <div class="game-header">
        <h1>Connections Unlimited Game</h1>
        <p>Play NYT Connections Unlimited Game - an enhanced, Wordle-like and never-ending version of the popular NYT Connections Game. Improve your vocabulary and have endless fun finding word groups. Great for all ages!</p>
      </div>
       
        {Object.entries(foundGroups).map(([groupName, words], index) => (
        <div
          className="game-group"
          key={groupName}
          style={{ backgroundColor: levelColors[index % levelColors.length] }}
        >
          <h3 className="group-name">{groupName}</h3>
          <div className="group-members">{words.join(', ')}</div>
        </div>
      ))}

<div className="top-g"><p className="p-text">Create four groups of four.</p><div className="game-time">Time: {`${Math.floor(timeElapsed / 60).toString().padStart(2, '0')}:${(timeElapsed % 60).toString().padStart(2, '0')}`}</div></div>
      

      {currentGame && currentGame.startingGroups.map((group, groupIndex) => (
        <div className="game-board" key={groupIndex}>
          {group.map((word, wordIndex) => (
            <button
            className={`game-item 
              ${currentGuess.includes(word) ? 'selected' : ''} 
              ${animationWords.includes(word) ? `${animation}-animation` : ''} 
              ${word.length === 8 ? 'size-8' : ''} 
              ${word.length > 8 ? 'size-more' : ''}`}
            key={wordIndex}
            onClick={() => handleWordClick(word)}
          >
            {word || ' '}
          </button>
          
          ))}
        </div>
      ))}
      {message && <div className="message">{message}</div>}
      {gameOver ? (
        <>
          <button className="game-btn" onClick={restartGame}>Restart the same Game</button>
          <button className="game-btn" onClick={startNewGame}>Start New Game</button>
        </>
      ) : (
        <>
          {currentGame && Object.keys(foundGroups).length === Object.keys(currentGame.groups).length ? (
            <>
                <div className="congratulations">
                    <h2>Congratulations!</h2>
                    <p>You have found all groups!</p>
                    <div className="share">
  {selectionStreak.map((guess, index) => (
    <div key={index} className="share-row">
      {guess.map((wordObj, i) => (
        <span key={i} style={{ backgroundColor: levelColors[wordObj.level] }}>
          
        </span>
      ))}
    </div>
  ))}
</div>
<button className="game-btn" style={{ backgroundColor:'#000000', color:'#fff', marginTop:'10px' }} onClick={copyResultsToClipboard}>Share Results</button>
                </div>
                <button className="game-btn" onClick={startNewGame}>Start New Game</button>
            </>
        
          ) : (
            <div className="btn-wrapper">
              <button className="game-btn submit-btn" onClick={submitGuess}>Submit</button>
              <button className="game-btn" onClick={resetGuess}>Deselect</button>
              <button className="game-btn" onClick={startNewGame}>Start New Game</button>
            </div>
          )}
          <div className="game-attempts">Mistakes remaining: {attempts}</div>
        </>
      )}
    </div>

    <div class="footer">
      <div class="inner-wrapper">
        <div class="logo"><a href="https://www.connectionsunlimited.org"><img src="/logo-connections-unlimited.jpeg" style={{width:320+'px'}} alt="logo-connections-unlimited" /></a></div>
          <div class="contact">© 2023 – ConnectionsUnlimited.org</div>
          
          <div class="disclaimer">Disclaimer: Connections Unlimited is an independent product and is not affiliated with, nor has it been authorized, sponsored, or otherwise approved by The New York Times Company. We encourage you to play the daily NYT Connections game on New York Times website.</div>
      </div>
    </div>
    </>
  );
}

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

export default Game;