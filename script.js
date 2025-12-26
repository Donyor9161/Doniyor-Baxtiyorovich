for(let i=0;i<200;i++){
    let qor = document.createElement("div");
    qor.className = "qor";
    qor.innerHTML = "❅";
    qor.style.left = Math.random()*100 + "vw";
    qor.style.height = Math.random()*30 + "vh";
    qor.style.animationDuration = 3 + Math.random()*6 + "s";
    document.body.appendChild(qor);
}
setTimeout(() => {
  document.body.classList.add("blur");
}, 3300);

window.addEventListener("load", () => {
    const loader = document.getElementById("loader");
    loader.classList.add("loaderend");
    setTimeout(() => loader.style.display = "none", 2100);
});

