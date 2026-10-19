import Phaser from 'phaser';

interface GameOverData {
  coins: number;
  distance: number;
  stars: number;
  carrots: number;
  boxes: number;
  ads: number;
}

export default class GameOver extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data: GameOverData) {
    const width = this.scale.width;
    const height = this.scale.height;

    // Dim background
    const bg = this.add.rectangle(0, 0, width, height, 0x174D2A, 0.85).setOrigin(0, 0);
    bg.setInteractive();

    // Emit event to React so React's Game Over modal with animated stats and claim button appears!
    window.dispatchEvent(
      new CustomEvent('game:ride_end', {
        detail: {
          coins: data.coins || 0,
          distance: data.distance || 0,
          stars: data.stars || 0,
          carrots: data.carrots || 0,
          boxes: data.boxes || 0,
          adViews: data.ads || 0
        }
      })
    );

    // Listen to React "ride_again" event to restart FarmRide scene
    const onRestart = () => {
      this.scene.start('FarmRide');
    };

    window.addEventListener('game:restart_ride', onRestart, { once: true });
  }
}
