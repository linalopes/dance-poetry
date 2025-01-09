let video;
let bodyPose;
let poses = [];
let connections;
let rightElbowX = 0;
let rightElbowY = 0;

let poemText = "A clock swallows the sun whole,";
let rules = {
    start: "$subject $verb $object.",
    subject: "I | You | They",
    object: "coffee | bread | milk",
    verb: "want | hate | like | love"
  };
let surreal = {
    start: [
      "A clock $action_clock the sun whole,",
      "its hands dripping $liquid into the sea.",
      "From the $liquid rise $stars, $action_stars softly,",
      "weaving galaxies between the cat's whiskers.",
      "The galaxies dissolve into $object,",
      "which flies through the eye of a forgotten storm."
    ],
    
    action_clock: ["swallows", "devours", "embraces", "engulfs"],
    liquid: ["honey", "amber", "golden syrup", "molten light"],
    stars: ["stars", "sparks", "cosmic embers", "dream fragments"],
    action_stars: ["purring", "singing", "glowing", "whispering"],
    cat: ["cat", "panther", "tiger of glass", "celestial feline"],
    object: ["an origami swan", "a paper bird", "a folded crane", "a feathered whisper"]
  };
let heros = {
        start: "$line1 $line2",
        line1: "$hero $verbs $drink.",
        line2: "That's just how $hero is.",
        hero: "Dave | Wing | Teri",
        verbs: "wants | likes | loves",
        drink: "coffee | tea | milk"
};

let speaking = false; // Track if we're currently speaking

/* 
===========================================================
SETUP
This section initializes the video capture, canvas, and
starts the body pose detection. It also prepares the game
logic for issuing commands like "Dead!" or "Alive!".
===========================================================
*/

function preload() {
    // Preload the bodyPose model using ml5.js with horizontal flip for mirroring and max poses limit
    bodyPose = ml5.bodyPose({ 
        flipHorizontal: true,
        maxPoses: 1  // Set maximum number of poses to detect (1, 2, or 3)
    });
}


function setup() {
    // Dynamically create the canvas and attach it to the "video-wrapper" div in the HTML
    const videoWrapper = document.getElementById('video-wrapper');
    const canvas = createCanvas(640, 480);
    canvas.parent(videoWrapper);

    // Initialize video capture and hide the video element (only show the canvas)
    video = createCapture(VIDEO);
    video.size(640, 480);
    video.hide();

    /// Start detecting body poses using the video feed
    bodyPose.detectStart(video, gotPoses);

    // Get skeleton connection information for drawing lines between keypoints
    connections = bodyPose.getSkeleton();

    // Update the poem text in the DOM
    const poemElement = document.getElementById('poem');
    if (poemElement) {
        poemElement.textContent = poemText;
    }
}

/* 
===========================================================
DRAWING
This section is responsible for rendering the mirrored video
feed on the canvas, visualizing detected poses, and drawing 
skeletons and keypoints for the participant.
===========================================================
*/

function draw() {
    // Draw the mirrored video feed on the canvas
    push();
    translate(width, 0);
    scale(-1, 1);
    image(video, 0, 0, width, height);
    pop();

    // Debug: Check if poses are being detected
    console.log("Poses detected:", poses.length);

    // Limit the number of poses to process
    const maxPosesToDraw = Math.min(poses.length, 1); // Change this number to 1, 2, or 3 as needed
    
    // Loop through detected poses to draw skeletons and keypoints
    for (let i = 0; i < maxPosesToDraw; i++) {
        let pose = poses[i];
        
        // Get right elbow position (keypoint 8 in ML5's PoseNet)
        let rightElbow = pose.keypoints[8];
        if (rightElbow && rightElbow.confidence > 0.1) {
            rightElbowX = width - rightElbow.x; // Adjust for mirrored video
            rightElbowY = rightElbow.y;
            
            // Draw a larger point for the right elbow
            fill(255, 255, 0); // Yellow color for right elbow
            noStroke();
            ellipse(rightElbow.x, rightElbow.y, 20, 20);
            
            // Display coordinates
            fill(255,0,0);
            noStroke();
            textSize(16);
            text(`Right Elbow: (${Math.floor(rightElbowX)}, ${Math.floor(rightElbowY)})`, 10, 30);

            // Check if elbow is in the trigger zone and call poem()
            if (rightElbowX >= 150 && rightElbowX <= 200 && 
                rightElbowY >= 150 && rightElbowY <= 200) {
                poem();
                // Draw trigger zone indicator
                fill(0, 255, 0, 50); // Semi-transparent green
                noStroke();
                rect(width - 200, 150, 50, 50); // Adjust for mirrored video
            }
        }

        // Draw skeleton connections for the pose
        for (let j = 0; j < connections.length; j++) {
            let pointAIndex = connections[j][0];
            let pointBIndex = connections[j][1];
            let pointA = pose.keypoints[pointAIndex];
            let pointB = pose.keypoints[pointBIndex];

            if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
                stroke(255, 0, 0);
                strokeWeight(2);
                line(pointA.x, pointA.y, pointB.x, pointB.y);
            }
        }

        // Draw keypoints for each person
        for (let j = 0; j < pose.keypoints.length; j++) {
            let keypoint = pose.keypoints[j];
            if (keypoint.confidence > 0.1) {
                fill(0, 255, 0); // Green color for keypoints
                noStroke();
                circle(keypoint.x, keypoint.y, 10);
            }
        }

    }
    
}

// Callback function to handle detected poses
function gotPoses(results) {
    console.log("Got poses:", results);
    poses = results;
}

function poem() {
    // Update the poem text in the DOM
    const poemElement = document.getElementById('poem');
    poemText = RiTa.grammar(surreal).expand();
    
    // Find and highlight dynamic words
    Object.keys(surreal).forEach(key => {
        if (key !== 'start') {
            surreal[key].forEach(word => {
                // Create a regex that matches the whole word
                let regex = new RegExp(`\\b${word}\\b`, 'g');
                poemText = poemText.replace(regex, `<span class="highlight-word">${word}</span>`);
            });
        }
    });
    
    if (poemElement) {
        poemElement.innerHTML = poemText;
        
        // Get clean text without HTML tags for speech
        let cleanText = poemText.replace(/<[^>]*>/g, '');
        
        // Stop any ongoing speech
        window.speechSynthesis.cancel();
        speaking = false;
        
        // Create and configure speech utterance
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 0.9; // Slightly slower rate
        utterance.pitch = 1;
        utterance.volume = 1;
        
        // Add event listeners
        utterance.onstart = () => {
            speaking = true;
            console.log('Started speaking');
        };
        
        utterance.onend = () => {
            speaking = false;
            console.log('Finished speaking');
        };
        
        // Speak the poem
        window.speechSynthesis.speak(utterance);
    }
}