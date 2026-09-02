

const canvas =
    document.getElementById("particles");

const ctx =
    canvas.getContext("2d");


function resizeCanvas() {

    canvas.width =
        window.innerWidth;

    canvas.height =
        window.innerHeight;

}


resizeCanvas();

window.addEventListener(
    "resize",
    resizeCanvas
);


const particles = [];


for (let i = 0; i < 80; i++) {

    particles.push({

        x:
            Math.random() *
            canvas.width,

        y:
            Math.random() *
            canvas.height,

        size:
            Math.random() * 2,

        speed:
            Math.random() * .5 + .1

    });

}


function animateParticles() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    particles.forEach(p => {

        p.y -= p.speed;


        if (p.y < 0) {

            p.y =
                canvas.height;

            p.x =
                Math.random() *
                canvas.width;

        }


        ctx.beginPath();

        ctx.arc(
            p.x,
            p.y,
            p.size,
            0,
            Math.PI * 2
        );


        ctx.fillStyle =
            "rgba(0,247,255,.35)";

        ctx.fill();

    });


    requestAnimationFrame(
        animateParticles
    );

}


animateParticles();




const messages = [

    "Preparing next generation of the party...",

    "Connecting experimental modules...",

    "Optimizing digital experience...",

    "Synchronizing Party Core...",

    "Installing new ideas...",

    "Compiling something awesome...",

    "Running final system checks...",

    "Almost ready... probably.",

    "Party mode is being prepared..."

];


const terminal =
    document.getElementById(
        "terminalMessage"
    );


let messageIndex = 0;


function changeMessage() {

    messageIndex++;

    if (
        messageIndex >=
        messages.length
    ) {

        messageIndex = 0;

    }


    terminal.innerHTML = `

        <span class="time">
            [LIVE]
        </span>

        <span class="purple">
            PARTY
        </span>

        ${messages[messageIndex]}

    `;

}


setInterval(
    changeMessage,
    3500
);



const loadingText =
    document.getElementById(
        "loadingText"
    );

const dots =
    document.getElementById(
        "dots"
    );


let dotCount = 0;


setInterval(() => {

    dotCount++;

    if (dotCount > 3) {

        dotCount = 0;

    }


    dots.textContent =
        ".".repeat(dotCount);

}, 450);






const title =
    document.querySelector("h1");


setInterval(() => {

    if (Math.random() > .75) {

        title.style.transform =
            "translateX(-2px)";

        setTimeout(() => {

            title.style.transform =
                "translateX(2px)";

        }, 50);


        setTimeout(() => {

            title.style.transform =
                "translateX(0)";

        }, 100);

    }

}, 2500);

