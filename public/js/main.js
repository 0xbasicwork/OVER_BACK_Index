document.addEventListener('DOMContentLoaded', () => {
    // Animate score counting up
    const scoreElement = document.querySelector('.score');
    const targetScore = parseInt(scoreElement.textContent);
    let currentScore = 0;
    
    const animateScore = () => {
        if (currentScore < targetScore) {
            currentScore++;
            scoreElement.textContent = currentScore;
            requestAnimationFrame(animateScore);
        }
    };
    
    animateScore();

    // Animate bars filling
    const bars = document.querySelectorAll('.fill');
    bars.forEach(bar => {
        const width = bar.style.width;
        bar.style.width = '0';
        setTimeout(() => {
            bar.style.width = width;
        }, 100);
    });
});
