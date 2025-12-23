for(let i=0;i<55;i++){
    let qor = document.createElement("div");
    qor.className = "qor";
    qor.innerHTML = ".";
    qor.style.left = Math.random()*100 + "vw";
    qor.style.animationDuration = 3 + Math.random()*2 + "s";
    document.body.appendChild(qor);
}
