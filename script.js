document.addEventListener("DOMContentLoaded", () => {
    const progressBars = document.querySelectorAll(".progress");

    const observerOptions = {
        root: null, // Viewport as the root
        threshold: 0.5, // Trigger when 50% of the element is visible
    };

    const progressAnimationObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                // Trigger animation by setting the width to the custom property
                entry.target.style.animation = "fillProgress 1.5s ease-in-out forwards";
                observer.unobserve(entry.target); // Stop observing once animated
            }
        });
    }, observerOptions);

    // Observe all progress bars
    progressBars.forEach((bar) => {
        progressAnimationObserver.observe(bar);
    });
});
document.getElementById("projects-link").addEventListener("click", function (event) {
    event.preventDefault(); // Prevent default link behavior

    document.getElementById("projects").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
});
