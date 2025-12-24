for(let i=0;i<120;i++){
    let qor = document.createElement("div");
    qor.className = "qor";
    qor.innerHTML = "❅";
    qor.style.left = Math.random()*100 + "vw";
    qor.style.animationDuration = 3 + Math.random()*6 + "s";
    document.body.appendChild(qor);
}
setTimeout(() => {
  document.body.classList.add("blur"); // 4 sekunddan keyin blur qo‘shadi
}, 1700);
setTimeout(() => {
    document.getElementById("logo").classList.add("jsanim");
}, 2000);
setTimeout(() => {
    document.getElementById("navbar").classList.add("jsanim");
}, 2000);

window.addEventListener("load", () => {
    const loader = document.getElementById("loader");
    loader.classList.add("loaderend");
    setTimeout(() => loader.style.display = "none", 1200);
});

