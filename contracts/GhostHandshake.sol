// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title GhostHandshake
/// @notice Commit–reveal pairing. Two strangers who committed the same
///         secret word and reveal in time mint a permanent Pair.
/// @dev    V1 is FREE TO PLAY (no stake). Do not add payable until the
///         match loop is proven. Hash: keccak256(abi.encodePacked(word, salt))
///         with word as UTF-8 string and salt as bytes32.
contract GhostHandshake {
    /// ~10 minutes at 300ms blocks. Tune after measuring testnet.
    uint64 public constant REVEAL_WINDOW = 2000;

    struct Commitment {
        bytes32 commitHash;
        uint64 committedAtBlock;
        bool revealed;
        bytes32 wordHash; // set on reveal; used to unstick pendingRevealer
    }

    struct Pair {
        address a;
        address b;
        bytes32 wordHash;
        uint64 matchedAtBlock;
    }

    mapping(address => Commitment) public commitments;
    mapping(bytes32 => bool) public wordClaimed;
    mapping(bytes32 => address) public pendingRevealer;
    mapping(address => uint256) public handshakeCount;

    Pair[] public allPairs;

    /// If true, a word can only complete one pair ever. Default false so
    /// the Afterimage canvas can grow all day (8 words × 1 pair is too scarce).
    bool public retireWords;

    address public owner;

    event Committed(address indexed player, bytes32 commitHash, uint64 atBlock);
    event Revealed(address indexed player, bytes32 wordHash);
    event Matched(
        address indexed a,
        address indexed b,
        bytes32 wordHash,
        uint256 pairIndex,
        uint64 atBlock
    );
    event Cancelled(address indexed player, bytes32 commitHash);
    event RetireWordsSet(bool on);

    error AlreadyCommitted();
    error NoCommit();
    error AlreadyRevealed();
    error BadReveal();
    error WordRetired();
    error CannotMatchSelf();
    error WindowExpired();
    error WindowOpen();
    error NotOwner();

    constructor() {
        owner = msg.sender;
        retireWords = false;
    }

    function setRetireWords(bool on) external {
        if (msg.sender != owner) revert NotOwner();
        retireWords = on;
        emit RetireWordsSet(on);
    }

    function commit(bytes32 commitHash) external {
        if (commitments[msg.sender].commitHash != bytes32(0)) revert AlreadyCommitted();
        commitments[msg.sender] = Commitment({
            commitHash: commitHash,
            committedAtBlock: uint64(block.number),
            revealed: false,
            wordHash: bytes32(0)
        });
        emit Committed(msg.sender, commitHash, uint64(block.number));
    }

    function reveal(string calldata word, bytes32 salt) external {
        Commitment storage c = commitments[msg.sender];
        if (c.commitHash == bytes32(0)) revert NoCommit();
        if (c.revealed) revert AlreadyRevealed();
        if (keccak256(abi.encodePacked(word, salt)) != c.commitHash) revert BadReveal();
        if (block.number > c.committedAtBlock + REVEAL_WINDOW) revert WindowExpired();

        bytes32 wordHash = keccak256(bytes(word));
        if (retireWords && wordClaimed[wordHash]) revert WordRetired();

        c.revealed = true;
        c.wordHash = wordHash;

        address waiting = pendingRevealer[wordHash];
        if (waiting == address(0)) {
            pendingRevealer[wordHash] = msg.sender;
            emit Revealed(msg.sender, wordHash);
            return;
        }
        if (waiting == msg.sender) revert CannotMatchSelf();

        Commitment storage partnerC = commitments[waiting];
        if (block.number > partnerC.committedAtBlock + REVEAL_WINDOW) revert WindowExpired();

        if (retireWords) wordClaimed[wordHash] = true;
        delete pendingRevealer[wordHash];

        handshakeCount[msg.sender]++;
        handshakeCount[waiting]++;

        allPairs.push(
            Pair({
                a: waiting,
                b: msg.sender,
                wordHash: wordHash,
                matchedAtBlock: uint64(block.number)
            })
        );

        emit Matched(waiting, msg.sender, wordHash, allPairs.length - 1, uint64(block.number));

        delete commitments[msg.sender];
        delete commitments[waiting];
    }

    /// Permissionless cleanup after the window. Works for unrevealed commits
    /// AND for a lonely first-revealer stuck in pendingRevealer.
    function cancel(address player) external {
        Commitment storage c = commitments[player];
        if (c.commitHash == bytes32(0)) revert NoCommit();
        if (block.number <= c.committedAtBlock + REVEAL_WINDOW) revert WindowOpen();

        if (c.revealed && c.wordHash != bytes32(0) && pendingRevealer[c.wordHash] == player) {
            delete pendingRevealer[c.wordHash];
        }
        emit Cancelled(player, c.commitHash);
        delete commitments[player];
    }

    function totalPairs() external view returns (uint256) {
        return allPairs.length;
    }

    function getPair(uint256 index) external view returns (Pair memory) {
        return allPairs[index];
    }

    function getAllPairs() external view returns (Pair[] memory) {
        return allPairs;
    }
}
