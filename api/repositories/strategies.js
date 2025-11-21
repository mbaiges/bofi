// Configured Strategies Repository
// Stores predefined configured strategy instances that reference strategy classes with specific parameters

const configuredStrategies = [
    {
        id: 'default-full-strategy-conservative',
        name: 'Conservative Full Strategy',
        description: 'Combines DMI (threshold: 25) and Bollinger Bands (period: 20, std: 2) with conservative take-profit (-10%)',
        config: {
            id: 'default-full-strategy',
            config: {
                tradingStrategy: {
                    id: 'delayed-composite-strategy',
                    config: {
                        minSignals: 1,
                        delayMin: 0,
                        delayMax: 0,
                        strategies: [
                            {
                                id: 'standard-dmi-strategy',
                                config: {
                                    adxStrengthThreshold: 25
                                }
                            },
                            {
                                id: 'standard-bollinger-bands-strategy',
                                config: {
                                    period: 20,
                                    stdDev: 2,
                                    adxStrengthThreshold: 15
                                }
                            }
                        ]
                    }
                },
                exitStrategy: {
                    id: 'take-profit-exit-strategy',
                    config: {
                        pct: -0.1
                    }
                }
            }
        }
    }
    // Add more configured strategies here as needed
];

const configuredStrategiesMap = new Map(
    configuredStrategies.map(config => [config.id, config])
);

/**
 * Get a configured strategy by its unique ID
 * @param {string} id - The unique ID of the configured strategy
 * @returns {Object|null} The configured strategy or null if not found
 */
export function getConfiguredStrategy(id) {
    return configuredStrategiesMap.get(id) || null;
}

/**
 * Get all configured strategies
 * @returns {Array} Array of all configured strategies
 */
export function getAllConfiguredStrategies() {
    return Array.from(configuredStrategiesMap.values());
}

/**
 * Preload configured strategies (initializes the map)
 * This is called at module load time, but kept as a function for explicit initialization if needed
 */
export function preloadConfiguredStrategies() {
    // Already loaded at module initialization
    return configuredStrategiesMap.size;
}

