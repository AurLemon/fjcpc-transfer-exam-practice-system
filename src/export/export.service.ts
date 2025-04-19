import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from '../database/entities/question.entity';
import * as docx from 'docx';
import {
  Document,
  Paragraph,
  TextRun,
  ImageRun,
  Packer,
  HeadingLevel,
  AlignmentType,
} from 'docx';
import axios from 'axios';

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
  ) {}

  /**
   * 从数据库获取随机题目
   * @param count 要获取的题目数量
   * @returns 问题实体数组
   */
  async getRandomQuestions(count: number): Promise<Question[]> {
    return this.questionRepository
      .createQueryBuilder('question')
      .where('question.status = :status', { status: true })
      .orderBy('RAND()') // MySQL特定的随机排序
      .limit(count)
      .getMany();
  }

  /**
   * 从HTML文本中提取图片URL
   * @param text HTML文本
   * @returns 图片URL数组
   */
  private extractImagesFromHtml(text: string): string[] {
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/gi;
    const urls: string[] = [];
    let match;

    while ((match = imgRegex.exec(text)) !== null) {
      urls.push(match[1]);
    }

    return urls;
  }

  /**
   * 下载图片并返回Buffer
   * @param url 图片URL
   * @returns 图片Buffer
   */
  private async downloadImage(url: string): Promise<Buffer> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      console.error(`无法下载图片: ${url}`, error);
      throw new Error(`无法下载图片: ${url}`);
    }
  }

  /**
   * 获取图片类型
   * @param url 图片URL
   * @returns 图片类型("jpg", "png", "gif", "bmp")
   */
  private getImageType(url: string): 'jpg' | 'png' | 'gif' | 'bmp' {
    // 从URL中提取文件扩展名
    const extension = url.split('.').pop()?.toLowerCase() || '';

    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'jpg';
      case 'png':
        return 'png';
      case 'gif':
        return 'gif';
      case 'bmp':
        return 'bmp';
      // 将SVG转换为PNG或JPG处理
      case 'svg':
        return 'png'; // 转换为PNG
      default:
        return 'jpg'; // 默认类型
    }
  }

  /**
   * 格式化问题文本，移除HTML标签
   * @param text HTML文本
   * @returns 纯文本
   */
  private stripHtml(text: string): string {
    return text.replace(/<[^>]+(>|$)/g, '');
  }

  /**
   * 格式化选项
   * @param options 选项数组
   * @param questionType 题目类型
   * @returns 格式化后的选项字符串和图片URL
   */
  private formatOptions(
    options: any[],
    questionType: number,
  ): { text: string; imageUrls: Map<string, string> } {
    // 判断题特殊处理
    if (questionType === 2) {
      // 根据前端代码，type=2为判断题
      return { text: 'T. 对     F. 错', imageUrls: new Map() };
    }

    if (!options || !Array.isArray(options) || options.length === 0) {
      return { text: '', imageUrls: new Map() };
    }

    let formattedText = '';
    const imageUrlsMap = new Map<string, string>();

    options.forEach((option) => {
      const label = option.xx || '';
      const text = this.stripHtml(option.txt || '');
      formattedText += `${label}. ${text}     `;

      // 提取选项中的图片
      const imageUrls = this.extractImagesFromHtml(option.txt || '');
      if (imageUrls.length > 0) {
        imageUrls.forEach((url) => {
          imageUrlsMap.set(url, label);
        });
      }
    });

    return { text: formattedText.trim(), imageUrls: imageUrlsMap };
  }

  /**
   * 获取正确答案标签
   * @param question 问题实体
   * @param options 选项数组
   * @returns 正确答案字符串
   */
  private getCorrectAnswerLabel(question: Question, options: any[]): string {
    if (!question.answer) return '';

    // 判断题特殊处理
    if (question.type === 2) {
      // 判断题
      const answerId = Array.isArray(question.answer)
        ? Array.isArray(question.answer[0])
          ? question.answer[0][0]
          : question.answer[0]
        : question.answer;

      // 查找对应选项
      const option = options.find(
        (opt) => opt.id.toString() === answerId.toString(),
      );
      // 根据选项内容确定是T还是F
      return option && option.txt === '对' ? 'T' : 'F';
    }

    // 处理普通选择题
    if (!options || options.length === 0) return '';

    const answerIds = Array.isArray(question.answer)
      ? Array.isArray(question.answer[0])
        ? question.answer[0]
        : question.answer
      : [question.answer];

    const answerLabels = answerIds.map((id) => {
      const option = options.find((opt) => opt.id.toString() === id.toString());
      return option ? option.xx : '';
    });

    return answerLabels.join(', ');
  }

  /**
   * 生成Word文档
   * @param count 题目数量
   * @returns 包含Word文档的Buffer
   */
  async exportToWord(count: number): Promise<Buffer> {
    const questions = await this.getRandomQuestions(count);

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: await this.generateWordContent(questions),
        },
      ],
    });

    return await Packer.toBuffer(doc);
  }

  /**
   * 创建图片Run对象
   * @param imageBuffer 图片数据
   * @param url 图片URL (用于获取类型)
   * @param width 宽度
   * @param height 高度
   * @returns ImageRun对象
   */
  private createImageRun(
    imageBuffer: Buffer,
    url: string,
    width: number,
    height: number,
  ): ImageRun {
    const options = {
      data: imageBuffer,
      transformation: {
        width,
        height,
      },
      type: this.getImageType(url),
    };

    return new ImageRun(options);
  }

  /**
   * 生成Word文档内容
   * @param questions 问题实体数组
   * @returns 段落对象数组
   */
  private async generateWordContent(
    questions: Question[],
  ): Promise<Paragraph[]> {
    const content: Paragraph[] = [];

    // 添加标题
    content.push(
      new Paragraph({
        text: '导出题目',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({}), // 空段落用于间距
    );

    // 处理每个问题
    for (let index = 0; index < questions.length; index++) {
      const question = questions[index];
      const questionNumber = index + 1;

      // 处理题目文本和图片
      const questionText = this.stripHtml(question.content);
      const questionImages = this.extractImagesFromHtml(question.content);

      // 处理选项
      const options = question.options as any[];
      const { text: formattedOptions, imageUrls: optionImagesMap } =
        this.formatOptions(options, question.type);

      // 获取正确答案
      const correctAnswer = this.getCorrectAnswerLabel(question, options);

      // 添加题目文本
      content.push(
        new Paragraph({
          text: `${questionNumber}.${questionText}`,
        }),
      );

      // 添加题目中的图片
      if (questionImages.length > 0) {
        for (const imageUrl of questionImages) {
          try {
            const imageBuffer = await this.downloadImage(imageUrl);

            content.push(
              new Paragraph({
                children: [
                  this.createImageRun(imageBuffer, imageUrl, 400, 200),
                ],
                alignment: AlignmentType.CENTER,
              }),
            );
          } catch (error) {
            // 如果图片下载失败，添加一个说明
            content.push(
              new Paragraph({
                text: `[无法加载图片: ${imageUrl}]`,
                alignment: AlignmentType.CENTER,
              }),
            );
          }
        }
      }

      // 添加选项文本
      content.push(
        new Paragraph({
          text: formattedOptions,
        }),
      );

      // 添加选项中的图片
      if (optionImagesMap.size > 0) {
        for (const [imageUrl, label] of optionImagesMap.entries()) {
          try {
            const imageBuffer = await this.downloadImage(imageUrl);

            content.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `选项${label}图片：`,
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  this.createImageRun(imageBuffer, imageUrl, 300, 150),
                ],
                alignment: AlignmentType.CENTER,
              }),
            );
          } catch (error) {
            // 如果图片下载失败，添加一个说明
            content.push(
              new Paragraph({
                text: `[无法加载选项${label}图片: ${imageUrl}]`,
                alignment: AlignmentType.CENTER,
              }),
            );
          }
        }
      }

      // 添加正确答案
      content.push(
        new Paragraph({
          text: `正确答案：${correctAnswer}。`,
        }),
        new Paragraph({}), // 空段落用于间距
      );
    }

    return content;
  }
}
