import { Injectable } from '@angular/core';
import { BLANK_PDF, type Template } from '@pdfme/common';
import { generate } from '@pdfme/generator';
import { format } from 'date-fns';
import { table, text, svg } from '@pdfme/schemas';
import {
  BlobWriter,
  ZipWriter,
  Uint8ArrayReader,
  BlobReader,
} from '@zip.js/zip.js';

interface ExportConfig {
  columns: {
    id: string;
    title: string;
  }[];
  tasks: {
    id: string;
    columnId: string;
    title: string;
    start: Date;
    end: Date;
    participants: string[];
    draggable: boolean;
    resizable: {
      beforeStart: boolean;
      afterEnd: boolean;
    };
    color: {
      primary: string;
      secondary: string;
    };
  }[];
  participants: {
    name: string;
  }[];
}

type Hour = string;
type Place = string;
type Description = string;

type PdfScheduleTuple = [Hour, Place, Description];

@Injectable({
  providedIn: 'root',
})
export class ExportService {
  private participantTemplate = {
    schemas: [
      [
        {
          name: 'title',
          type: 'text',
          position: {
            x: 25.62,
            y: 36.99,
          },
          width: 149.24,
          height: 9.99,
          rotate: 0,
          alignment: 'center',
          verticalAlignment: 'top',
          fontSize: 21,
          lineHeight: 1,
          characterSpacing: 0,
          fontColor: '#000000',
          backgroundColor: '',
          opacity: 1,
          strikethrough: false,
          underline: true,
          required: true,
          readOnly: false,
          fontName: 'Roboto',
        },
        {
          name: 'schedule',
          type: 'table',
          position: {
            x: 26.14,
            y: 55.92,
          },
          width: 150,
          height: 32.348,
          showHead: true,
          head: ['Hora', 'Lugar', 'Descripción'],
          headWidthPercentages: [30, 30, 40],
          tableStyles: {
            borderWidth: 0.3,
            borderColor: '#000000',
          },
          headStyles: {
            fontName: 'Roboto',
            fontSize: 13,
            characterSpacing: 0,
            alignment: 'left',
            verticalAlignment: 'middle',
            lineHeight: 1,
            fontColor: '#ffffff',
            borderColor: '',
            backgroundColor: '#2980ba',
            borderWidth: {
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            },
            padding: {
              top: 5,
              right: 5,
              bottom: 5,
              left: 5,
            },
          },
          bodyStyles: {
            fontName: 'Roboto',
            fontSize: 11,
            characterSpacing: 0,
            alignment: 'left',
            verticalAlignment: 'middle',
            lineHeight: 1,
            fontColor: '#000000',
            borderColor: '#888888',
            backgroundColor: '',
            alternateBackgroundColor: '#f5f5f5',
            borderWidth: {
              top: 0.1,
              right: 0.1,
              bottom: 0.1,
              left: 0.1,
            },
            padding: {
              top: 5,
              right: 5,
              bottom: 5,
              left: 5,
            },
          },
          columnStyles: {},
          required: false,
          readOnly: false,
        },
        {
          name: 'image',
          type: 'svg',
          content:
            '<svg width="445" height="95" viewBox="0 0 445 95" fill="none" xmlns="http://www.w3.org/2000/svg">\n<circle cx="47.1987" cy="47.8371" r="46.9076" fill="white"/>\n<circle cx="47.1987" cy="47.8371" r="46.9076" fill="white"/>\n<path d="M94.1063 47.8371C94.1063 73.7435 73.105 94.7447 47.1987 94.7447C21.2923 94.7447 0.291016 73.7435 0.291016 47.8371C0.291016 21.9307 21.2923 0.929443 47.1987 0.929443C73.105 0.929443 94.1063 21.9307 94.1063 47.8371Z" fill="#F53B16"/>\n<circle cx="47.1987" cy="47.8371" r="46.9076" fill="black"/>\n<path fill-rule="evenodd" clip-rule="evenodd" d="M45.3124 94.7075L36.7101 45.9215C35.6193 45.7238 34.5528 45.2927 33.5851 44.6151C30.0019 42.1061 29.1311 37.1675 31.6401 33.5843C34.1491 30.0011 39.0877 29.1302 42.6709 31.6392C46.2541 34.1482 47.125 39.0869 44.616 42.6701C43.891 43.7055 42.963 44.5145 41.9236 45.0808L50.6585 94.6191C49.5162 94.7024 48.3625 94.7448 47.1989 94.7448C46.5671 94.7448 45.9382 94.7323 45.3124 94.7075Z" fill="#F53B16"/>\n<path fill-rule="evenodd" clip-rule="evenodd" d="M47.5176 94.7438L56.9924 26.2099C56.5335 25.9892 56.0909 25.7168 55.6726 25.3915C52.4992 22.9236 51.9273 18.3504 54.3951 15.177C56.863 12.0036 61.4362 11.4317 64.6096 13.8996C67.783 16.3674 68.3549 20.9406 65.8871 24.114C64.827 25.4771 63.3786 26.3602 61.8195 26.7286L52.4565 94.4534C50.8338 94.6344 49.186 94.7326 47.5176 94.7438Z" fill="#FBBC05"/>\n<path fill-rule="evenodd" clip-rule="evenodd" d="M45.7969 94.7243L71.3367 58.903C68.9713 55.6416 69.5227 51.0599 72.6736 48.4615C75.95 45.7594 80.7965 46.2251 83.4985 49.5015C86.2006 52.778 85.7349 57.6245 82.4585 60.3265C80.4605 61.9742 77.8787 62.444 75.5553 61.8167L52.2715 94.4739C50.6054 94.653 48.9131 94.7449 47.1994 94.7449C46.7303 94.7449 46.2627 94.738 45.7969 94.7243Z" fill="#229F43"/>\n<path fill-rule="evenodd" clip-rule="evenodd" d="M45.2818 94.7065L17.1514 58.1262C15.5199 58.6858 13.6858 58.6764 11.9663 57.9663C8.21597 56.4175 6.43129 52.1217 7.98008 48.3714C9.52887 44.6211 13.8246 42.8364 17.575 44.3852C21.3253 45.934 23.1099 50.2298 21.5612 53.9801C21.3999 54.3705 21.209 54.7396 20.9919 55.0858L51.3507 94.5637C49.9828 94.6837 48.598 94.745 47.1989 94.745C46.5568 94.745 45.9177 94.7321 45.2818 94.7065Z" fill="#388BFF"/>\n<path d="M141.197 70.14H148.193V72.3255H143.972V77.8001H147.283V79.9856H143.972V88.4386H141.197V70.14Z" fill="#202020"/>\n<path d="M168.258 70.14H175.039V72.3255H171.033V77.8001H174.129V79.9856H171.033V86.253H175.147V88.4386H168.258V70.14Z" fill="#202020"/>\n<path d="M194.654 84.7317C194.654 84.3389 194.676 83.9782 194.718 83.6496C194.768 83.314 194.84 82.9533 194.933 82.5676H197.086V83.4568C197.086 83.9496 197.115 84.3853 197.172 84.7638C197.236 85.1424 197.336 85.4638 197.472 85.7281C197.615 85.9852 197.8 86.1816 198.029 86.3173C198.265 86.4459 198.55 86.5101 198.886 86.5101C199.414 86.5101 199.818 86.3673 200.097 86.0816C200.375 85.7888 200.514 85.3638 200.514 84.8067C200.514 84.521 200.493 84.2603 200.45 84.0246C200.414 83.7818 200.347 83.5425 200.247 83.3068C200.154 83.0711 200.025 82.8247 199.861 82.5676C199.697 82.3033 199.486 82.0105 199.229 81.6891L196.336 78.25C195.822 77.593 195.425 76.9323 195.147 76.2681C194.868 75.5967 194.729 74.8824 194.729 74.1254C194.729 73.5183 194.822 72.9612 195.008 72.4541C195.2 71.947 195.475 71.5113 195.833 71.147C196.19 70.7756 196.629 70.4899 197.15 70.2899C197.679 70.0828 198.275 69.9792 198.939 69.9792C199.747 69.9792 200.418 70.0935 200.954 70.3221C201.496 70.5506 201.929 70.8506 202.25 71.222C202.571 71.5934 202.796 72.0112 202.925 72.4755C203.061 72.9326 203.128 73.3933 203.128 73.8575C203.128 74.2504 203.096 74.6146 203.032 74.9503C202.975 75.2788 202.907 75.6431 202.828 76.0431H200.686V75.1753C200.686 74.2039 200.546 73.4611 200.268 72.9469C199.989 72.4255 199.536 72.1648 198.907 72.1648C198.386 72.1648 197.997 72.3112 197.74 72.604C197.482 72.8897 197.354 73.2754 197.354 73.7611C197.354 74.0182 197.372 74.2504 197.407 74.4575C197.45 74.6646 197.507 74.8574 197.579 75.036C197.657 75.2074 197.75 75.3753 197.857 75.5395C197.965 75.7038 198.086 75.8752 198.222 76.0538L201.446 79.9535C202.032 80.7177 202.482 81.4534 202.796 82.1605C203.111 82.8604 203.268 83.6032 203.268 84.3889C203.268 85.0388 203.164 85.6245 202.957 86.1459C202.757 86.6673 202.468 87.1101 202.089 87.4743C201.711 87.8386 201.254 88.1207 200.718 88.3207C200.182 88.5136 199.579 88.61 198.907 88.61C198.079 88.61 197.39 88.4993 196.84 88.2779C196.297 88.0564 195.861 87.7636 195.533 87.3994C195.211 87.0351 194.983 86.6208 194.847 86.1566C194.718 85.6923 194.654 85.2174 194.654 84.7317Z" fill="#202020"/>\n<path d="M225.507 72.3255H222.561V70.14H231.217V72.3255H228.282V88.4386H225.507V72.3255Z" fill="#202020"/>\n<path d="M141.197 12.8184H168.173C170.644 12.8184 172.886 13.3218 174.9 14.3285C176.913 15.2895 178.492 16.6623 179.636 18.447C180.78 20.1859 181.352 22.1994 181.352 24.4874C181.352 27.0957 180.62 29.3609 179.156 31.2828C177.737 33.159 175.907 34.4632 173.664 35.1953V35.4699C176.318 35.9733 178.469 37.2774 180.117 39.3824C181.81 41.4417 182.656 43.8899 182.656 46.727C182.656 50.9827 181.284 54.2546 178.538 56.5426C175.838 58.7849 172.383 59.906 168.173 59.906H141.197V12.8184ZM165.359 31.626C167.189 31.626 168.608 31.1684 169.615 30.2532C170.621 29.2922 171.125 28.0796 171.125 26.6152C171.125 24.8763 170.644 23.5493 169.683 22.6341C168.768 21.7189 167.487 21.2613 165.839 21.2613H151.219V31.626H165.359ZM166.526 51.4632C168.265 51.4632 169.683 50.9599 170.781 49.9531C171.88 48.9464 172.429 47.5049 172.429 45.6288C172.429 43.9356 171.88 42.5628 170.781 41.5103C169.683 40.4578 168.082 39.9316 165.977 39.9316H151.219V51.4632H166.526Z" fill="#202020"/>\n<path d="M188.675 12.8184H198.628V59.906H188.675V12.8184Z" fill="#202020"/>\n<path d="M204.347 55.2385L228.165 21.2613H206.131V12.8184H242.786V17.5547L219.036 51.4632H243.403V59.906H204.347V55.2385Z" fill="#202020"/>\n<path d="M249.741 12.8184H259.419L277.54 38.4215C278.09 39.1994 279.005 40.7324 280.286 43.0204L280.629 42.8145L280.423 38.8333V12.8184H290.102V59.906H280.423L262.234 34.0971C261.364 32.8616 260.472 31.3515 259.557 29.5668L259.213 29.7727C259.351 31.7404 259.419 33.1132 259.419 33.8912V59.906H249.741V12.8184Z" fill="#202020"/>\n<path d="M313.212 12.8184H325.704L344.1 59.906H333.255L329.891 50.9141H308.475L305.112 59.906H294.816L313.212 12.8184ZM326.734 42.6086L322.272 30.6651C321.723 29.2007 320.739 26.1119 319.321 21.3985H318.977C317.559 26.1119 316.575 29.2007 316.026 30.6651L311.564 42.6086H326.734Z" fill="#202020"/>\n<path d="M367.141 60.7297C359.865 60.7297 354.237 58.7392 350.256 54.758C346.32 50.7768 344.353 44.6449 344.353 36.3622C344.353 28.2626 346.458 22.1765 350.668 18.1038C354.878 14.0311 360.826 11.9948 368.514 11.9948C372.587 11.9948 376.293 12.6354 379.634 13.9167C383.02 15.1522 385.697 17.0513 387.665 19.6139C389.678 22.1307 390.685 25.2195 390.685 28.8804H380.389C380.389 26.3178 379.245 24.2815 376.957 22.7714C374.715 21.2155 372.015 20.4376 368.857 20.4376C364.053 20.4376 360.46 21.7189 358.081 24.2815C355.747 26.844 354.58 30.5278 354.58 35.3326V37.3919C354.58 42.4255 355.655 46.1779 357.806 48.6489C360.003 51.0743 363.343 52.2869 367.828 52.2869C371.534 52.2869 374.6 51.4175 377.026 49.6786C379.451 47.8939 380.686 45.4915 380.732 42.4713H366.455V34.303H390.685V59.906H383.821L382.929 54.6893C380.732 56.7943 378.421 58.3273 375.996 59.2883C373.571 60.2492 370.619 60.7297 367.141 60.7297Z" fill="#202020"/>\n<path d="M413.427 12.8184H425.92L444.316 59.906H433.47L430.107 50.9141H408.691L405.328 59.906H395.032L413.427 12.8184ZM426.95 42.6086L422.488 30.6651C421.939 29.2007 420.955 26.1119 419.536 21.3985H419.193C417.775 26.1119 416.791 29.2007 416.242 30.6651L411.78 42.6086H426.95Z" fill="#202020"/>\n</svg>',
          position: {
            x: 10,
            y: 10,
          },
          readOnly: true,
          width: 75,
          height: 12.5,
          required: false,
        },
      ],
    ],
    basePdf: BLANK_PDF,
    pdfmeVersion: '5.0.0',
  };

  constructor() {}

  async export(config: ExportConfig): Promise<any> {
    const columnsById = new Map<string, ExportConfig['columns'][number]>(
      config.columns.map((column) => [column.id, column])
    );

    const generatedSchedules: {
      participant: string;
      pdf: Uint8Array;
    }[] = [];

    for (const participant of config.participants) {
      const tasksOfParticipant = config.tasks
        .filter((task) => task.participants.includes(participant.name))
        .sort((a, b) => a.start.getTime() - b.start.getTime());

      const tuples: PdfScheduleTuple[] = tasksOfParticipant.map((task) => {
        const columnOfTask = columnsById.get(task.columnId);

        if (!columnOfTask) {
          throw new Error(`Column with id ${task.columnId} not found`);
        }

        return [
          `${format(task.start, 'HH:mm')}-${format(task.end, 'HH:mm')}`,
          columnsById.get(task.columnId)!.title,
          task.title,
        ];
      });

      const pdf = await generate({
        template: this.participantTemplate,
        inputs: [
          {
            title: participant.name,
            schedule: tuples,
          },
        ],
        plugins: {
          Table: table,
          Text: text,
          Svg: svg,
        },
      });

      generatedSchedules.push({
        participant: participant.name,
        pdf,
      });
    }

    const zipFileWriter = new BlobWriter('application/zip');
    const zipWriter = new ZipWriter(zipFileWriter);

    for (const generatedSchedule of generatedSchedules) {
      const reader = new Uint8ArrayReader(generatedSchedule.pdf);
      await zipWriter.add(`schedule/${generatedSchedule.participant}.pdf`, reader);
    }

    await zipWriter.close();

    const blob = await zipFileWriter.getData();
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'schedules.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
