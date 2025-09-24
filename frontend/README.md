# DotArbiter Frontend

This is the frontend for the DotArbiter multi-chain DAO governance protocol built on Polkadot's Asset Hub.

## Features

- **Polkadot Aesthetics**: Uses Polkadot pink (#e6007a), white, and black color scheme
- **DAO Front Page**: Displays an overview of the DAO and its purpose
- **Proposal Creation**: Create multi-chain proposals with multiple actions
- **Proposal Listing**: Browse all proposals with their status
- **Proposal Detail View**: View detailed information about each proposal and vote
- **Member Profile**: View your voting power and delegation status
- **Delegation System**: Browse delegates and manage your delegation
- **Metamask Integration**: Connect your wallet to interact with the DAO
- **Navigation**: Easy navigation with a responsive navbar

## Pages

1. **Home Page** (`/`): Main landing page with overview of the DAO
2. **Proposals Page** (`/proposals`): List all proposals with status indicators
3. **Create Proposal Page** (`/create-proposal`): Form to create new proposals
4. **Proposal Detail Page** (`/proposal/:id`): Detailed view of a specific proposal
5. **Delegates Page** (`/delegates`): Browse delegates and manage your delegation
6. **Profile Page** (`/profile`): View your member profile and voting status

## Components

- `Navbar`: Navigation bar with links to all main pages
- `Proposals`: Component to list and display proposals
- `CreateProposal`: Form to create new proposals with multiple actions
- `ProposalDetail`: Detailed view of a proposal with voting functionality
- `Delegates`: Display delegates and handle delegation management
- `Profile`: Display user's profile information and voting stats

## Technical Details

- Built with React, TypeScript, Tailwind CSS
- Uses Wagmi for Web3 interactions
- Uses RainbowKit for wallet connection
- Uses React Router for navigation
- Responsive design for mobile and desktop
- Polkadot-inspired color scheme and UI elements

## Contracts Integration

- Interacts with the GovernanceHub proxy contract
- Uses generated contract ABIs and addresses
- Supports both local Hardhat and Paseo Asset Hub networks