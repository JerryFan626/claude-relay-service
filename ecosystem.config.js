/**
 * PM2 进程管理配置
 *
 * 此配置实现和 `npm run service:start` 相同的启动方式
 * 但增加了守护进程、自动重启、开机自启等功能
 *
 * 启动方式：npm run pm2:start
 * 等同于运行：node src/app.js (但带守护和自动重启功能)
 */

module.exports = {
  apps: [
    {
      // 应用名称（用于 pm2 命令中识别进程）
      name: 'claude-relay-service',

      // 启动脚本（和 service:start 完全相同，直接运行 src/app.js）
      script: 'src/app.js',

      // 工作目录（当前项目根目录）
      cwd: './',

      // ============ 实例配置 ============
      // 单实例运行（和 service:start 一样）
      instances: 1,

      // fork 模式（和 service:start 一样，不使用集群）
      exec_mode: 'fork',

      // ============ 自动重启配置（核心功能）============
      // 进程崩溃后自动重启
      autorestart: true,

      // 不监听文件变化（生产环境）
      watch: false,

      // 内存超过 1G 自动重启（防止内存泄漏）
      max_memory_restart: '1G',

      // ============ 崩溃保护配置 ============
      // 进程至少运行 10 秒才算成功启动
      min_uptime: '10s',

      // 10 秒内异常重启超过 10 次则停止自动重启（防止无限重启）
      max_restarts: 10,

      // 重启延迟 4 秒（给系统和依赖服务缓冲时间）
      restart_delay: 4000,

      // ============ 环境变量 ============
      // 生产环境配置（可以通过 .env 文件覆盖）
      env: {
        NODE_ENV: 'production'
        // PORT 等其他配置从 config/config.js 读取
      },

      // ============ 日志配置 ============
      // 错误日志路径
      error_file: 'logs/pm2-error.log',

      // 输出日志路径
      out_file: 'logs/pm2-out.log',

      // 日志时间格式
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // 合并所有实例的日志
      merge_logs: true,

      // ============ 优雅关闭配置 ============
      // 强制终止前等待 5 秒（和 service:stop 的 SIGTERM 类似）
      kill_timeout: 5000,

      // 等待应用发送 ready 信号
      wait_ready: false,

      // 监听超时 10 秒
      listen_timeout: 10000,

      // 支持通过消息优雅关闭
      shutdown_with_message: false
    }
  ]
}
