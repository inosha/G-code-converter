/**
 * App Main Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    const inputEditor = document.getElementById('input-editor');
    const outputEditor = document.getElementById('output-editor');
    const sourceSelect = document.getElementById('source-machine');
    const targetSelect = document.getElementById('target-machine');
    const inputStats = document.getElementById('input-stats');
    const outputStats = document.getElementById('output-stats');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const appContainer = document.getElementById('app-container');

    const converter = new GCodeConverter();
    let debounceTimer;

    const performConversion = () => {
        const input = inputEditor.value;
        const from = sourceSelect.value;
        const to = targetSelect.value;

        appContainer.classList.add('converting');
        statusText.textContent = 'Converting...';

        // Update stats
        const inputLines = input.split('\n').filter(l => l.trim()).length;
        inputStats.textContent = `${inputLines} Lines`;

        // Run conversion
        const result = converter.convert(input, from, to);
        
        outputEditor.value = result;

        // Update output stats
        const outputLines = result.split('\n').filter(l => l.trim()).length;
        outputStats.textContent = `${outputLines} Lines`;

        setTimeout(() => {
            appContainer.classList.remove('converting');
            statusText.textContent = 'Ready';
        }, 300);
    };

    const handleInput = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(performConversion, 400);
    };

    const swapBtn = document.getElementById('swap-btn');

    const swapMachines = () => {
        const fromVal = sourceSelect.value;
        const toVal = targetSelect.value;
        
        sourceSelect.value = toVal;
        targetSelect.value = fromVal;
        
        // Add a little rotation animation
        swapBtn.style.transform = swapBtn.style.transform === 'rotate(180deg)' ? 'rotate(0deg)' : 'rotate(180deg)';
        
        performConversion();
    };

    // Event Listeners
    swapBtn.addEventListener('click', swapMachines);
    inputEditor.addEventListener('input', handleInput);
    outputEditor.addEventListener('input', () => {
        // Allow editing in output, but maybe warn it will be overwritten if input changes?
        // For now, just update stats.
        const lines = outputEditor.value.split('\n').filter(l => l.trim()).length;
        outputStats.textContent = `${lines} Lines (Edited)`;
    });

    sourceSelect.addEventListener('change', performConversion);
    targetSelect.addEventListener('change', performConversion);

    // Initial Example
    inputEditor.value = `%
O1001 (EXAMPLE PROGRAM)
G00 G90 G54 X0 Y0
G43 H1 Z15.
M3 S1200
G01 Z-5. F200
X50. Y50.
G02 X50. Y0. I0. J-25.
G00 Z15.
M5
M30
%`;
    
    performConversion();
});
