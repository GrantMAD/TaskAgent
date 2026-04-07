export const CURRENCY_SYMBOL = 'R';

export const TASK_CATEGORIES = [
    { label: 'Cleaning', value: 'Cleaning', icon: 'tint' },
    { label: 'Delivery', value: 'Delivery', icon: 'truck' },
    { label: 'Tech Help', value: 'Tech', icon: 'laptop' },
    { label: 'Moving', value: 'Moving', icon: 'cube' },
    { label: 'Gardening', value: 'Gardening', icon: 'leaf' },
    { label: 'Handyman', value: 'Handyman', icon: 'wrench' },
    { label: 'Pet Care', value: 'Pets', icon: 'paw' },
    { label: 'Other', value: 'Other', icon: 'ellipsis-h' },
];

export const NEIGHBORHOOD_TIPS = [
    {
        id: 1,
        title: 'Stay Safe',
        description: 'Always meet in public places for the first time.',
        icon: 'shield'
    },
    {
        id: 2,
        title: 'Build Trust',
        description: 'Complete tasks on time to earn 5-star reviews.',
        icon: 'star'
    },
    {
        id: 3,
        title: 'Communicate',
        description: 'Keep neighbors updated through the chat.',
        icon: 'comments'
    },
    {
        id: 4,
        title: 'Be Detailed',
        description: 'Add clear photos to your tasks to get better applicants.',
        icon: 'camera'
    },
    {
        id: 5,
        title: 'Fair Pricing',
        description: 'Check similar tasks to ensure your budget is competitive.',
        icon: 'tag'
    },
    {
        id: 6,
        title: 'Verify Profiles',
        description: "Always check a neighbor's reviews before hiring.",
        icon: 'check-circle-o'
    },
    {
        id: 7,
        title: 'Clear Scopes',
        description: 'Define exactly what needs to be done to avoid confusion.',
        icon: 'list-alt'
    },
    {
        id: 8,
        title: 'Quick Replies',
        description: 'Responding fast helps you secure the best help.',
        icon: 'bolt'
    }
];

export const TASK_STATUS = {
    OPEN: 'OPEN',
    ASSIGNED: 'ASSIGNED',
    PENDING_CONFIRMATION: 'PENDING_CONFIRMATION',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    DISPUTED: 'DISPUTED',
    INVITED: 'INVITED', // Mobile-specific for recurring tasks
    PENDING_APPROVAL: 'PENDING_APPROVAL' // Mobile-specific for recurring tasks
};
