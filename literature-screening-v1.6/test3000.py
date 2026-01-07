import random
import time

def generate_ris_file(filename="test_30k.ris", total_count=30000):
    print(f"🚀 开始生成 {total_count} 条压力测试数据...")
    start_time = time.time()
    
    with open(filename, "w", encoding="utf-8") as f:
        # 1. 生成 29,900 条正常且唯一的文献 (用于测试渲染和内存)
        for i in range(1, 29901):
            ris_record = (
                "TY  - JOUR\n"
                f"TI  - [Normal Record {i}] Effect of Large Scale Data on Web Performance\n"
                f"AU  - Tester, Auto {i}\n"
                f"AB  - This is a synthetic abstract generated for load testing. Record number {i}.\n"
                f"DO  - 10.1000/test.doi.{i}\n"
                "PY  - 2024\n"
                "ER  - \n\n"
            )
            f.write(ris_record)

        # 2. 生成 50 对 DOI 重复文献 (测试 DOI 去重策略)
        # 这里的 DOI 与上面的某些记录故意重复
        print("⚡ 正在注入 DOI 重复样本...")
        for i in range(1, 51):
            ris_record = (
                "TY  - JOUR\n"
                f"TI  - [Duplicate DOI {i}] Different Title But Same DOI\n"
                f"AU  - Hacker, Duplicate\n"
                f"DO  - 10.1000/test.doi.{i}\n" # 这里的DOI和上面前50条一样
                "PY  - 2023\n"
                "ER  - \n\n"
            )
            f.write(ris_record)

        # 3. 生成 40 对 标题重复文献 (测试 标题归一化 去重策略)
        # 标题只有大小写和标点的区别
        print("⚡ 正在注入 标题(Title) 重复样本...")
        for i in range(51, 91):
            ris_record = (
                "TY  - JOUR\n"
                f"TI  - [normal record {i}] effect of large scale data on web performance\n" # 只有大小写不同
                f"AU  - Tester, CaseSensitive\n"
                f"DO  - 10.1000/test.unique.{i}\n"
                "PY  - 2024\n"
                "ER  - \n\n"
            )
            f.write(ris_record)

        # 4. 生成 10 条 格式错误的文献 (测试 ErrorTracker 容错机制)
        print("⚠️ 正在注入 格式错误 样本...")
        
        # 错误类型A: 没有 ER 结尾
        f.write("TY  - JOUR\nTI  - Broken Record No End Tag\nAU  - Error, Man\n\n")
        
        # 错误类型B: 只有 ER 没有开始
        f.write("ER  - \n\n")
        
        # 错误类型C: 乱码或非RIS格式
        f.write("This is just a random line that should trigger a parser warning.\n\n")

    end_time = time.time()
    file_size_mb = (len(open(filename, 'rb').read()) / 1024 / 1024)
    
    print(f"✅ 生成完成！")
    print(f"📂 文件名: {filename}")
    print(f"📦 文件大小: {file_size_mb:.2f} MB")
    print(f"⏱️ 耗时: {end_time - start_time:.2f} 秒")
    print("-" * 30)
    print("🎯 测试预期结果：")
    print("1. 总记录数应接近 30,000 条")
    print("2. 应该检测到约 50 个 DOI 重复")
    print("3. 应该检测到约 40 个 标题重复")
    print("4. ErrorTracker 应该报告至少 3-5 个严重解析错误")

if __name__ == "__main__":
    generate_ris_file()