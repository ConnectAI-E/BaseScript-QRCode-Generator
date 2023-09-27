import { bitable, FieldType } from '@lark-base-open/js-sdk';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

// @ts-ignore
window.bitable = bitable


export default async function main(ui: any, t = (s: string) => s) {
  const canvas = document.getElementById('barcode') as HTMLCanvasElement

  const context = canvas.getContext("2d")!;

  /** 从文本生成条码png File */
  function textToPngFileBarcode({ codeText, filename = 'code.png', width, height, ...rest }: any) {

    // 绘制条形码
    JsBarcode('#barcode', codeText, { width, height, ...rest }); // 更多配置参考https://github.com/lindell/JsBarcode

    // 将Base64编码的图像转换为Blob对象
    const base64Data = canvas.toDataURL("image/png");

    // 创建File对象
    var file = dataURLtoFile(base64Data, filename)
    return file;
  }


  function dataURLtoFile(dataurl: string, filename: string) {
    var arr = dataurl.split(','),
      mime = arr[0].match(/:(.*?);/)![1],
      bstr = atob(arr[arr.length - 1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  function renderQrcode(ui: any, t: (t: string) => string) {
    ui.form(
      (form: any) => ({
        formItems: [
          form.tableSelect('table', { label: t('select.table'), placeholder: t('select.table.placeholder') }),
          form.fieldSelect('urlField', {
            label: t('select.url'),
            placeholder: t('select.url.placeholder'),
            sourceTable: 'table',
            filterByTypes: [FieldType.Url, FieldType.Text, FieldType.Phone, FieldType.Number, FieldType.Formula, FieldType.Lookup],
          }),

          form.fieldSelect('attachmentField', {
            label: t('select.att'),
            placeholder: t('select.att.placeholder'),
            sourceTable: 'table',
            filterByTypes: [FieldType.Attachment],
          }),
          form.select('qrcodeType', { label: t('select.qrcode.type'), options: [{ label: 'svg', value: 'svg' }, { label: 'png', value: 'png' }], defaultValue: 'png' }),
          form.inputNumber('width', { label: t('select.qrcode.size'), defaultValue: 256 }),
          form.checkboxGroup('checkbox', { label: '', options: [{ label: t('qrcode.from.record'), value: '从记录链接生成二维码' }], defaultValue: [] }),
        ],
        buttons: [t('ok')],
      }),
      async ({ values }: any) => {
        const { table, urlField, attachmentField, qrcodeType, width, checkbox } = values;
        const attachmentFieldId = attachmentField?.id
        const tableId = table?.id;
        const urlFieldId = urlField?.id
        const selection = await bitable.base.getSelection();
        const { viewId } = selection
        if (!tableId || !urlFieldId || !attachmentFieldId) {
          ui.message.error(t('error.empty'));
          return;
        }
        ui.showLoading(' ');
        const field = await table.getFieldById(urlFieldId);
        const fieldType = await field.getType();

        const valueList = await field.getFieldValueList()
        const view = await table.getViewById(viewId!);
        const visibleRecordIdList = new Set(await view.getVisibleRecordIdList());
        const recordList = valueList.map(({ record_id }: { record_id: string }) => record_id).filter((recordId: string) => visibleRecordIdList.has(recordId));
        const totalCellValueCount = recordList.length;
        let count = 0;
        for (let i = 0; i < recordList.length; i++) {
          ui.showLoading(`${count}/${totalCellValueCount}`);
          const fieldMeta = await table.getFieldMetaById(urlFieldId);
          let url
          if (fieldMeta.type === FieldType.Url) {
            const cellValue = await table.getCellValue(urlFieldId, recordList[i]!);
            // @ts-ignore
            url = cellValue[0].link || cellValue[0].text;
          } else {
            url = await table.getCellString(urlFieldId, recordList[i]!);
          }
          if (checkbox.includes('从记录链接生成二维码')) {
            url = await bitable.bridge.getBitableUrl({
              tableId,
              viewId,
              recordId: recordList[i]!,
              fieldId: urlFieldId,
            })
          }

          if (url === null || url === '' || url === undefined) {
            continue;
          }
          let qrcodeFile:any, fileName:any;
          if (qrcodeType == 'svg') {
            const qrcodeSvgString = await QRCode.toString(url, {
              type: 'svg',
              errorCorrectionLevel: 'H',
              quality: 1,
              margin: 0, //二维码的白边距
              width: (+width || 0) < 10 ? 256 : width,
            } as any);
            const qrcodeSvgStringBlob = new Blob([qrcodeSvgString as any], { type: 'image/svg+xml' });
            fileName = 'qrcode.svg';
            qrcodeFile = new File([qrcodeSvgStringBlob], fileName, {
              type: 'image/svg+xml'
            })
          }

          if (qrcodeType == 'png') {
            const qrcodeDataURL = await QRCode.toDataURL(url, {
              errorCorrectionLevel: 'H',
              type: 'image/png',
              margin: 0,
              width: (+width || 0) < 10 ? 256 : width,
              // color: {
              //   dark:"#010599FF",
              //   light:"#FFBF60FF"
              // }
            });
            // 将二维码数据转换为 Blob 对象
            const response = await fetch(qrcodeDataURL);
            const qrcodeBlob = await response.blob();
            fileName = 'qrcode.png';
            qrcodeFile = new File([qrcodeBlob], fileName, { type: qrcodeBlob.type });
          }
          const tokens = await bitable.base.batchUploadFile([qrcodeFile] as any);
          const attachments = [
            {
              name: fileName,
              size: qrcodeFile!.size,
              type: qrcodeFile!.type,
              token: tokens[0],
              timeStamp: Date.now(),
            },
          ];
          await table.setCellValue(attachmentFieldId, recordList[i]!, attachments as any);
          count++;
        }

        ui.hideLoading();
      }
    );
  }

  function renderBarcode(ui: any, t: (t: string) => string) {
    ui.form(
      (form: any) => ({
        formItems: [
          form.tableSelect('table', { label: t('select.table'), placeholder: t('select.table.placeholder') }),
          form.fieldSelect('urlField', {
            label: t('select.url'),
            placeholder: t('select.url.placeholder'),
            sourceTable: 'table',
            filterByTypes: [FieldType.Url, FieldType.Text, FieldType.Phone, FieldType.Number, FieldType.Formula, FieldType.Lookup],
          }),

          form.fieldSelect('attachmentField', {
            label: t('select.att'),
            placeholder: t('select.att.placeholder'),
            sourceTable: 'table',
            filterByTypes: [FieldType.Attachment],
          }),
          // form.select('barcodeType', { label: t('select.code.type'), options: [{ label: 'svg', value: 'svg' }, { label: 'png', value: 'png' }], defaultValue: 'png' }),
          form.inputNumber('height', { label: t('select.code.size.height'), defaultValue: '80' }),
          form.inputNumber('width', { label: t('select.code.size.width'), defaultValue: '2' }),


          form.input('text', { label: t('select.code.text') }),
          form.select('displayValue', { label: t('select.code.displayValue'), options: [{ label: t('true'), value: true }, { label: t('false'), value: false }], defaultValue: true }),
          form.inputNumber('fontSize', { label: t('select.code.fontSize'), defaultValue: 20 }),
          form.inputNumber('margin', { label: t('select.code.margin'), defaultValue: 10 }),
          form.input('lineColor', { label: t('select.code.lineColor'), defaultValue: '#000000' }),
          form.input('background', { label: t('select.code.background'), defaultValue: '#ffffff' }),
        ],
        buttons: [t('ok')],
      }),
      async ({ values }: any) => {
        const { table, urlField, attachmentField, barcodeType = 'png', width, height, text, ...rest } = values;
        const urlFieldId = urlField?.id
        const attachmentFieldId = attachmentField?.id
        const tableId = table?.id
        if (!tableId || !urlFieldId || !attachmentFieldId) {
          ui.message.error(t('error.empty'));
          return;
        }
        ui.showLoading(' ');
        const field = await table.getFieldById(urlFieldId);
        const { viewId } = await bitable.base.getSelection();
        const valueList = await field.getFieldValueList()
        const view = await table.getViewById(viewId!);
        const visibleRecordIdList = new Set(await view.getVisibleRecordIdList());
        const recordList = valueList.map(({ record_id }: { record_id: string }) => record_id).filter((recordId: string) => visibleRecordIdList.has(recordId));

        const totalCellValueCount = recordList.length;
        let count = 0;
        try {
          for (let i = 0; i < recordList.length; i++) {
            ui.showLoading(`${count}/${totalCellValueCount}`);
            const fieldMeta = await table.getFieldMetaById(urlFieldId);
            let url
            if (fieldMeta.type === FieldType.Url) {
              const cellValue = await table.getCellValue(urlFieldId, recordList[i]!);
              //@ts-ignore
              url = cellValue[0].link || cellValue[0].text;
            } else {
              url = await table.getCellString(urlFieldId, recordList[i]!);
            }
            if (url === null || url === '' || url === undefined) {
              continue;
            }
            let barcodeFile:any, fileName:any;
            if (barcodeType == 'svg') {
              fileName = new Date().getTime() + 'barcode.svg';
              // barcodeFile = textToSVGFileBarcode(url, fileName)
            }

            if (barcodeType == 'png') {
              fileName = new Date().getTime() + 'barcode.png';
              let _width = (+width || 0) < 0 ? 2 : width
              if (_width > 30) {
                _width = 30
              }
              barcodeFile = textToPngFileBarcode({ codeText: url, width: _width, height, text, ...rest })

            }
            const tokens = await bitable.base.batchUploadFile([barcodeFile] as any);
            const attachments = [
              {
                name: fileName,
                size: barcodeFile!.size,
                type: barcodeFile!.type,
                token: tokens[0],
                timeStamp: Date.now(),
              },
            ];
            await table.setCellValue(attachmentFieldId, recordList[i]!, attachments as any);
            count++;
          }
        } catch (error) {
          ui.message.error(error);
          ui.hideLoading();
        }


        ui.hideLoading();
      }
    );
  }


  ui.markdown(`
   ${t('title.desc')}
  `);
  ui.form(
    (form: any) => ({
      formItems: [
        form.select('scene', {
          label: t('choose.code'),
          options: [
            { value: '二维码', label: t('qrcode') },
            { value: '条码', label: t('barcode') },
          ],
        }),
      ],
      buttons: [t('ok')],
    }),
    async (params: any) => {
      if (params.values.scene === '二维码') {
        renderQrcode(ui, t);
      } else {
        renderBarcode(ui, t);
      }
    }
  );

}


