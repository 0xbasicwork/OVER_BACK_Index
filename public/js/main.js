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
    document.querySelectorAll('.fill[data-width]').forEach(bar => {
        const width = parseFloat(bar.getAttribute('data-width'));
        bar.style.width = '0';
        setTimeout(() => {
            bar.style.width = width + '%';
        }, 500);
    });
});
