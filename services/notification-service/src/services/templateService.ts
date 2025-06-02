import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';

// Define a type for the template names for better type safety
export type TemplateName = 
  | 'booking-confirmation' 
  | 'new-booking-to-business' 
  | 'booking-cancellation-customer' 
  | 'booking-cancellation-business';

interface TemplateCache {
  [key: string]: handlebars.HandlebarsTemplateDelegate;
}

class TemplateService {
  private templateCache: TemplateCache = {};
  private templatesDir = path.join(__dirname, '../templates'); // Assumes templates are in src/templates

  constructor() {
    this.preloadTemplates().catch(err => {
        logger.error("Failed to preload templates", { error: err });
        // Depending on strategy, might want to throw or exit if critical templates fail
    });
  }

  private async preloadTemplates(): Promise<void> {
    const templateFiles: { name: TemplateName; file: string }[] = [
      { name: 'booking-confirmation', file: 'booking-confirmation.hbs' },
      { name: 'new-booking-to-business', file: 'new-booking-to-business.hbs' },
      { name: 'booking-cancellation-customer', file: 'booking-cancellation-customer.hbs' },
      { name: 'booking-cancellation-business', file: 'booking-cancellation-business.hbs' },
    ];

    for (const { name, file } of templateFiles) {
      try {
        await this.loadTemplate(name, file);
      } catch (error) {
        logger.error(`Failed to load template ${name} from ${file}`, { error });
      }
    }
    logger.info("Templates preloaded (or attempted).");
  }

  private async loadTemplate(name: TemplateName, filename: string): Promise<handlebars.HandlebarsTemplateDelegate> {
    if (this.templateCache[name]) {
      return this.templateCache[name];
    }

    const filePath = path.join(this.templatesDir, filename);
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const compiledTemplate = handlebars.compile(fileContent);
      this.templateCache[name] = compiledTemplate;
      logger.debug(`Template loaded and compiled: ${name}`, { filePath });
      return compiledTemplate;
    } catch (error) {
      logger.error(`Error loading template ${name} from ${filePath}:`, { error });
      throw new Error(`Could not load template ${name}`);
    }
  }

  public async render(templateName: TemplateName, data: any): Promise<string> {
    let template = this.templateCache[templateName];
    if (!template) {
      // Attempt to load on-demand if not preloaded or if preloading failed for this specific template
      logger.warn(`Template ${templateName} not found in cache, attempting to load on-demand.`);
      // Construct filename based on templateName, assuming a convention like 'templateName.hbs'
      const filename = `${templateName}.hbs`; 
      template = await this.loadTemplate(templateName, filename);
    }

    // Add current year for footer automatically if not provided
    if (!data.currentYear) {
        data.currentYear = new Date().getFullYear();
    }

    try {
      return template(data);
    } catch (error) {
      logger.error(`Error rendering template ${templateName}:`, { error, templateData: data });
      throw new Error(`Could not render template ${templateName}`);
    }
  }
}

export const templateService = new TemplateService();
