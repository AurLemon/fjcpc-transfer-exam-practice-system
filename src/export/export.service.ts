import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from '../database/entities/question.entity';
import { RequestInfo } from '../database/entities/request_info.entity';
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
    @InjectRepository(RequestInfo)
    private requestInfoRepository: Repository<RequestInfo>,
  ) {}

  /**
   * 从数据库获取随机题目
   * @param count 要获取的题目数量
   * @param courseType 课程类型(1:文化课, 2:专业课, 0:全部)
   * @param subjectType 科目类型(根据课程类型不同而不同, 0:全部)
   * @param includeImage 是否包含带图片的题目
   * @param questionType 题目类型(0:单选, 1:多选, 2:判断题, 8:阅读题, -1:全部)
   * @returns 问题实体数组
   */
  async getRandomQuestions(
    count: number,
    courseType: number = 0,
    subjectType: number = 0,
    includeImage: boolean = true,
    questionType: number = -1,
  ): Promise<Question[]> {
    const query = this.questionRepository
      .createQueryBuilder('question')
      .where('question.status = :status', { status: true });

    // 根据课程类型筛选
    if (courseType > 0) {
      query.andWhere('question.course = :course', { course: courseType });

      // 根据科目类型筛选
      if (subjectType > 0) {
        query.andWhere('question.subject = :subject', { subject: subjectType });
      }
    }

    // 根据题目类型筛选
    if (questionType >= 0) {
      query.andWhere('question.type = :type', { type: questionType });
    }

    // 处理是否包含带图片的题目
    if (!includeImage) {
      query
        .andWhere('question.content NOT LIKE :imagePattern', {
          imagePattern: '%<img%',
        })
        .andWhere('question.options NOT LIKE :imagePattern', {
          imagePattern: '%<img%',
        });
    }

    return query
      .orderBy('RAND()') // MySQL特定的随机排序
      .limit(count)
      .getMany();
  }

  /**
   * 获取可用的课程和科目列表
   * @returns 课程和科目信息
   */
  async getCoursesAndSubjects(): Promise<{
    courses: { id: number; name: string }[];
    subjects: { courseId: number; id: number; name: string }[];
  }> {
    // 获取专业课科目信息
    const requestInfos = await this.requestInfoRepository.find({
      where: { course: 2 }, // 专业课
      select: ['course', 'subject', 'profession_name', 'profession_id'],
    });

    // 构建课程列表
    const courses = [
      { id: 1, name: '文化课' },
      { id: 2, name: '专业课' },
    ];

    // 构建科目列表
    const subjects = [
      { courseId: 1, id: 0, name: '全部' }, // 文化课-全部科目
      { courseId: 2, id: 0, name: '全部' }, // 专业课-全部科目
      // 文化课科目
      { courseId: 1, id: 1, name: '语文' },
      { courseId: 1, id: 2, name: '数学' },
      { courseId: 1, id: 3, name: '英语' },
      { courseId: 1, id: 4, name: '政治' },
    ];

    // 添加专业课科目
    requestInfos.forEach((info) => {
      subjects.push({
        courseId: 2,
        id: info.subject,
        name: info.profession_name || `未知专业(${info.subject})`,
      });
    });

    return { courses, subjects };
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
   * 格式化问题文本，移除HTML标签并转换HTML实体
   * @param text HTML文本
   * @returns 纯文本
   */
  private stripHtml(text: string): string {
    if (typeof window === 'undefined') {
      // 在Node.js环境中
      // 先替换常见的HTML实体
      const entityMap: Record<string, string> = {
        '&nbsp;': ' ',
        '&ensp;': ' ',
        '&emsp;': ' ',
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&apos;': "'",
        '&ldquo;': '"',
        '&rdquo;': '"',
        '&lsquo;': `'`,
        '&rsquo;': `'`,
        '&mdash;': '—',
        '&ndash;': '–',
        '&hellip;': '…',
      };

      // 替换所有已知的HTML实体
      let result = text;
      for (const [entity, char] of Object.entries(entityMap)) {
        result = result.replace(new RegExp(entity, 'g'), char);
      }

      // 处理数字HTML实体 (如 &#160;)
      result = result.replace(/&#(\d+);/g, (match, dec) => {
        return String.fromCharCode(parseInt(dec, 10));
      });

      // 最后移除所有HTML标签
      return result.replace(/<[^>]+(>|$)/g, '');
    } else {
      // 在浏览器环境中可以使用DOM API
      const doc = new DOMParser().parseFromString(text, 'text/html');
      return doc.body.textContent || '';
    }
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
   * 格式化选项
   * @param options 选项数组
   * @param questionType 题目类型
   * @param subOptions 子选项数组（用于阅读理解题）
   * @returns 格式化后的选项字符串和图片URL
   */
  private formatOptions(
    options: any[],
    questionType: number,
    subOptions?: any[],
  ): { text: string; imageUrls: Map<string, string> } {
    // 判断题特殊处理
    if (questionType === 2) {
      // 根据前端代码，type=2为判断题
      return { text: 'T. 对     F. 错', imageUrls: new Map() };
    }

    // 阅读理解题特殊处理
    if (questionType === 8 && subOptions && subOptions.length > 0) {
      let formattedText = '';
      const imageUrlsMap = new Map<string, string>();

      subOptions.forEach((subOption, subIndex) => {
        // 添加题干
        if (subOption.tg) {
          formattedText += `${subIndex + 1}. ${this.stripHtml(subOption.tg)}\n`;
        }

        // 添加选项
        if (subOption.list && Array.isArray(subOption.list)) {
          subOption.list.forEach((option) => {
            const label = option.xx || '';
            const text = this.stripHtml(option.txt || '');
            formattedText += `   ${label}. ${text}     `;

            // 提取选项中的图片
            const imageUrls = this.extractImagesFromHtml(option.txt || '');
            if (imageUrls.length > 0) {
              imageUrls.forEach((url) => {
                imageUrlsMap.set(url, `${subIndex + 1}${label}`);
              });
            }
          });

          formattedText += '\n';
        }
      });

      return { text: formattedText.trim(), imageUrls: imageUrlsMap };
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
   * 生成Word文档
   * @param count 题目数量
   * @param courseType 课程类型
   * @param subjectType 科目类型
   * @param includeImage 是否包含带图片的题目
   * @param questionType 题目类型(0:单选, 1:多选, 2:判断题, 8:阅读题, -1:全部)
   * @returns 包含Word文档的Buffer
   */
  async exportToWord(
    count: number,
    courseType: number = 0,
    subjectType: number = 0,
    includeImage: boolean = true,
    questionType: number = -1,
  ): Promise<Buffer> {
    const questions = await this.getRandomQuestions(
      count,
      courseType,
      subjectType,
      includeImage,
      questionType,
    );

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
   * 创建图片Run对象，保持图片宽高比
   * @param imageBuffer 图片数据
   * @param url 图片URL (用于获取类型)
   * @param maxWidth 最大宽度
   * @returns ImageRun对象
   */
  private createImageRun(
    imageBuffer: Buffer,
    url: string,
    maxWidth: number,
  ): ImageRun {
    // 需要同时设置width和height以满足类型要求
    // 使用一个自动缩放的比例，让大多数图片保持合理的宽高比
    const options = {
      data: imageBuffer,
      transformation: {
        width: maxWidth,
        height: Math.round(maxWidth * 0.6), // 使用黄金比例近似值，避免拉伸
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

      // 添加题目文本
      content.push(
        new Paragraph({
          text: `${questionNumber}.[${this.renderQuestionType(question.type)}] ${questionText}`,
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
                  // 只指定最大宽度，保持原始宽高比
                  this.createImageRun(imageBuffer, imageUrl, 450),
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

      // 处理选项
      const options = question.options as any[];
      const subOptions = question.sub_options as any[];

      // 根据题目类型选择合适的选项处理方式
      const { text: formattedOptions, imageUrls: optionImagesMap } =
        this.formatOptions(options, question.type, subOptions);

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
                  // 只指定最大宽度，保持原始宽高比
                  this.createImageRun(imageBuffer, imageUrl, 350),
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

      // 获取正确答案并添加
      const correctAnswer = this.getCorrectAnswerLabel(question, options);
      content.push(
        new Paragraph({
          text: `正确答案：${correctAnswer}。`,
        }),
        new Paragraph({}), // 空段落用于间距
      );
    }

    return content;
  }

  /**
   * 渲染题目类型名称
   * @param type 题目类型
   * @returns 题目类型名称
   */
  private renderQuestionType(type: number): string {
    switch (type) {
      case 0:
        return '单选题';
      case 1:
        return '多选题';
      case 2:
        return '判断题';
      case 8:
        return '阅读题';
      default:
        return '未知题型';
    }
  }
}
