/**
 * Game Logic Module — Balloon Shabd Suno & Pop (Grade 1–2)
 *
 * Encapsulates:
 * - Auditory word listening question generation (target, prompt audio, prompt display)
 * - Phonetically similar, rhyming, and anagram distractors generation
 * - Answer checking & mistake tracking
 */

function shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

export class GameLogic {
    /**
     * Generate a new challenge question for the given level
     * @param {Object} levelDef - Level configuration entry from level-config.js
     * @param {Object} options - { currentLevel, mistakeHistory, previousTarget }
     * @returns {Object} Question definition:
     *   - target: identifier/value of the correct answer (e.g. 'कमल')
     *   - promptDisplay: string to display on the challenge card
     *   - promptSubtext: text above prompt ("शब्द सुनो")
     *   - speechText: text for Hindi TTS speech (e.g. "पहचानो 'कमल'")
     *   - options: array of balloon options [{ value, display, isCorrect }]
     */
    static generateQuestion(levelDef, options = {}) {
        const mistakeHistory = options.mistakeHistory || {};
        const previousTarget = options.previousTarget || null;
        const clusters = levelDef.clusters || [
            ['कमल', 'कलम', 'नमक']
        ];
        const balloonCount = Math.min(Math.max(levelDef.balloonCount || 3, 3), 6);

        // Pick a cluster (prefer clusters that don't only contain previousTarget)
        const validClusters = clusters.filter(c => c.length >= 2);
        let chosenCluster = validClusters[Math.floor(Math.random() * validClusters.length)] || clusters[0];

        // Pick a target word from chosen cluster (avoid immediate repeat if possible)
        let candidates = chosenCluster.filter(w => w !== previousTarget);
        if (candidates.length === 0) candidates = chosenCluster;
        const targetWord = candidates[Math.floor(Math.random() * candidates.length)];

        // Select distractors from the same cluster
        const distractorSet = new Set();

        // 1. Prioritize missed words in this cluster
        Object.keys(mistakeHistory).forEach(word => {
            if (word !== targetWord && chosenCluster.includes(word) && distractorSet.size < balloonCount - 1) {
                distractorSet.add(word);
            }
        });

        // 2. Fill from remaining words in the same cluster
        const shuffledCluster = shuffle(chosenCluster.filter(w => w !== targetWord));
        for (const word of shuffledCluster) {
            if (distractorSet.size >= balloonCount - 1) break;
            distractorSet.add(word);
        }

        // 3. If cluster has fewer words than required balloon count, pull from other clusters in the level
        if (distractorSet.size < balloonCount - 1) {
            const allLevelWords = Array.from(new Set(clusters.flat())).filter(w => w !== targetWord && !distractorSet.has(w));
            const shuffledOther = shuffle(allLevelWords);
            for (const word of shuffledOther) {
                if (distractorSet.size >= balloonCount - 1) break;
                distractorSet.add(word);
            }
        }

        // Combine target + distractors and shuffle
        const allOptions = shuffle([targetWord, ...Array.from(distractorSet)]);

        const balloonOptions = allOptions.map(word => ({
            value: word,
            display: word,
            isCorrect: word === targetWord,
        }));

        return {
            target: targetWord,
            promptDisplay: targetWord,
            promptSubtext: 'शब्द सुनो',
            speechText: `पहचानो '${targetWord}'`,
            options: balloonOptions,
        };
    }

    /**
     * Check if a tapped balloon is correct
     * @param {*} tappedValue
     * @param {*} targetValue
     * @returns {boolean}
     */
    static checkAnswer(tappedValue, targetValue) {
        return tappedValue === targetValue;
    }

    /**
     * Record mistake for adaptive distractor generation
     */
    static recordMistake(mistakeHistory, tappedValue) {
        mistakeHistory[tappedValue] = (mistakeHistory[tappedValue] || 0) + 1;
    }
}
