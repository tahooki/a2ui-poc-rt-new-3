import { Node } from 'ts-morph';

import { Resolver } from './resolver';

import type { BindingElement, ParameterDeclaration, Type } from 'ts-morph';
import type { ExtractorOptions, Prop, ResolverOptions } from './types';

export class Extractor {
  private resolver: Resolver;
  private readonly rawTypeProps: Array<string>;
  private readonly complexAnnotationTypes: Array<string>;

  constructor(
    resolverOptions: ResolverOptions = {},
    extractorOptions: ExtractorOptions = {},
  ) {
    this.resolver = new Resolver(resolverOptions);
    this.rawTypeProps = extractorOptions.rawTypeProps ?? [];
    this.complexAnnotationTypes = extractorOptions.complexAnnotationTypes ?? [
      'ComponentPropsWithoutRef',
      'ComponentProps',
    ];
  }

  public extractFromType(
    type: Type,
    defaultValues: Map<string, string> = new Map(),
    contextNode?: Node,
  ): Array<Prop> {
    const props: Array<Prop> = [];
    const properties = type.getProperties();

    for (const prop of properties) {
      const propName = prop.getName();

      if (this.shouldSkipProp(propName, prop)) {
        continue;
      }

      const valueDeclaration =
        prop.getValueDeclaration() ?? prop.getDeclarations()[0];

      const propType = this.getPropType(prop, valueDeclaration, contextNode);

      if (!propType) {
        continue;
      }

      const resolvedType = this.resolvePropertyType(
        propName,
        propType,
        valueDeclaration,
      );

      const propInfo: Prop = {
        name: propName,
        type: resolvedType,
        isOptional: prop.isOptional(),
      };

      const description = this.getDescription(valueDeclaration);

      if (description) {
        propInfo.description = description;
      }

      const defaultValue = defaultValues.get(propName);

      if (defaultValue !== undefined) {
        propInfo.defaultValue = defaultValue;
      }

      props.push(propInfo);
    }

    return props;
  }

  public extractDefaultValues(
    param: ParameterDeclaration,
  ): Map<string, string> {
    const defaultValues = new Map<string, string>();
    const nameNode = param.getNameNode();

    if (!Node.isObjectBindingPattern(nameNode)) {
      return defaultValues;
    }

    for (const element of nameNode.getElements()) {
      const defaultValue = this.extractDefaultValueFromElement(element);

      if (defaultValue !== null) {
        const propName =
          element.getPropertyNameNode()?.getText() ?? element.getName();
        defaultValues.set(propName, defaultValue);
      }
    }

    return defaultValues;
  }

  private shouldSkipProp(
    propName: string,
    prop: ReturnType<Type['getProperties']>[number],
  ): boolean {
    if (propName === 'key' || propName === 'ref') {
      return true;
    }

    return this.isFromReactTypes(prop);
  }

  private getPropType(
    prop: ReturnType<Type['getProperties']>[number],
    valueDeclaration: Node | undefined,
    contextNode?: Node,
  ): Type | null {
    if (valueDeclaration) {
      return prop.getTypeAtLocation(valueDeclaration);
    }

    if (contextNode) {
      return prop.getTypeAtLocation(contextNode);
    }

    return null;
  }

  private resolvePropertyType(
    propName: string,
    propType: Type,
    valueDeclaration?: Node,
  ): string {
    const typeAnnotationText = this.getTypeAnnotationText(valueDeclaration);

    if (typeAnnotationText) {
      if (this.resolver.isPreservedType(typeAnnotationText)) {
        return typeAnnotationText;
      }

      if (this.isComplexTypeAnnotation(typeAnnotationText)) {
        return typeAnnotationText;
      }
    }

    if (this.rawTypeProps.includes(propName)) {
      return this.resolver.cleanTypeText(propType.getText());
    }

    return this.resolver.resolve(propType);
  }

  private getDescription(declaration?: Node): string | null {
    if (!declaration) {
      return null;
    }

    let rawDescription: string | null = null;

    if (Node.isPropertySignature(declaration)) {
      const jsDocs = declaration.getJsDocs();

      if (jsDocs.length > 0) {
        rawDescription = jsDocs[0].getDescription();
      }
    }

    if (Node.isPropertyDeclaration(declaration)) {
      const jsDocs = declaration.getJsDocs();

      if (jsDocs.length > 0) {
        rawDescription = jsDocs[0].getDescription();
      }
    }

    if (!rawDescription) {
      return null;
    }

    const cleaned = this.cleanDescription(rawDescription);

    return cleaned || null;
  }

  private cleanDescription(text: string): string {
    return (
      text
        .replace(/\/\*\*\s*/g, '')
        .replace(/\s*\*\//g, '')
        .replace(/^\s*\*\s?/gm, '')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  private getTypeAnnotationText(declaration?: Node): string | null {
    if (!declaration) {
      return null;
    }

    let rawText: string | null = null;

    if (Node.isPropertySignature(declaration)) {
      const typeNode = declaration.getTypeNode();

      if (typeNode) {
        rawText = typeNode.getText();
      }
    }

    if (Node.isPropertyDeclaration(declaration)) {
      const typeNode = declaration.getTypeNode();

      if (typeNode) {
        rawText = typeNode.getText();
      }
    }

    if (!rawText) {
      return null;
    }

    return this.cleanTypeText(rawText);
  }

  private cleanTypeText(text: string): string {
    return text
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/< /g, '<')
      .replace(/ >/g, '>')
      .trim();
  }

  private isComplexTypeAnnotation(text: string): boolean {
    return this.complexAnnotationTypes.some((t) => text.includes(`${t}<`));
  }

  private isFromReactTypes(
    prop: ReturnType<Type['getProperties']>[number],
  ): boolean {
    const declarations = prop.getDeclarations();

    if (declarations.length === 0) {
      return true;
    }

    for (const declaration of declarations) {
      const filePath = declaration.getSourceFile().getFilePath();

      if (!filePath.includes('node_modules')) {
        return false;
      }

      if (
        !filePath.includes('@types/react') &&
        !filePath.includes('node_modules/react/')
      ) {
        return false;
      }
    }

    return true;
  }

  private extractDefaultValueFromElement(
    element: BindingElement,
  ): string | null {
    const initializer = element.getInitializer();

    if (!initializer) {
      return null;
    }

    if (Node.isStringLiteral(initializer)) {
      return `"${initializer.getLiteralValue()}"`;
    }

    if (Node.isNumericLiteral(initializer)) {
      return initializer.getLiteralText();
    }

    if (Node.isTrueLiteral(initializer)) {
      return 'true';
    }

    if (Node.isFalseLiteral(initializer)) {
      return 'false';
    }

    if (Node.isNullLiteral(initializer)) {
      return 'null';
    }

    if (
      Node.isIdentifier(initializer) &&
      initializer.getText() === 'undefined'
    ) {
      return 'undefined';
    }

    if (Node.isArrayLiteralExpression(initializer)) {
      return initializer.getText();
    }

    if (Node.isObjectLiteralExpression(initializer)) {
      return initializer.getText();
    }

    return initializer.getText();
  }
}
