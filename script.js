

// ...existing code... FOR TRENDING SWIPER ...
// const swiper = new Swiper('.trend-swiper', {
//     slidesPerView: 'auto',
//     spaceBetween: 4,
//     loop: true,
//     autoplay: {
//         delay: 2500,
//         disableOnInteraction: false,
//     }
// });

// ...existing code... FOR TRENDING SWIPER ...
const swiper = new Swiper('.trend-swiper', {
    slidesPerView: 'auto',
    spaceBetween: 4,
    loop: true,
    freeMode: {
        enabled: true,
        momentum: true,
        momentumRatio: 0.5,
        sticky: false,
    },
    autoplay: {
        delay: 0,                 // continuous motion
        disableOnInteraction: false,
        waitForTransition: false, // don't wait for each transition
    },
    speed: 5000,                 // how long a full transition takes (adjust)
    allowTouchMove: true
});