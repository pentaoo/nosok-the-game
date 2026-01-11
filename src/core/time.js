export function createTime() {
  return {
    elapsed: 0,
    update(dt) {
      this.elapsed += dt;
    },
  };
}
